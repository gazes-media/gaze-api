import axios from "axios";
import { load } from "cheerio";
import { Anime } from "../interfaces/anime.interface";
import { Episode } from "../interfaces/episode.interface";
import { LatestEpisode } from "../interfaces/latest.interface";
import { PstreamData } from "../interfaces/pstreamdata.interface";
import Subtitlesvtt from "../interfaces/subtitlesvtt.interface";
const vostfrUrl = "https://neko.ketsuna.com/animes-search-vostfr.json";
const vfUrl = "https://neko.ketsuna.com/animes-search-vf.json";

export type seasons = {
    year: number;
    fiche: Anime;
};

export type seasonal = {
    title: string;
    title_english: string;
    title_romanji: string;
    genres: string[];
    cover_url: string;
    ids: number[];
    seasons: seasons[];
};

function buildProxiedUrl(url: string) {
    return `https://proxy.gazes.fr/?url=${encodeURIComponent(url)}`;
}

export class AnimeStore {
    static all: Anime[] = [];
    static seasons: seasonal[] = [];
    static vostfr: Anime[] = [];
    static vf: Anime[] = [];

    static latest: LatestEpisode[] = [];

    /* The function fetches data from two different URLs and
  combines them into one array with a language property added to
  each object.*/
    static async fetchAll(): Promise<void> {
        try {
            const responseVostfr = await axios.get(vostfrUrl);
            const responseVF = await axios.get(vfUrl);
            if(Array.isArray(responseVostfr.data) && Array.isArray(responseVF.data)){

            this.vostfr = responseVostfr.data.map(({ url_image, coverUrl,  ...anime}) => {
                return {
                    ...anime,
                    coverUrl: buildProxiedUrl("https://neko.ketsuna.com"+url_image.replace("https://neko-sama.fr","")),
                    url_image: buildProxiedUrl("https://neko.ketsuna.com"+url_image.replace("https://neko-sama.fr","")),
                };
            });
            this.vf = responseVF.data;
            this.all = [...this.vostfr, ...this.vf]
            }else{
                console.log("Problem occured while retrieving data from the server.")
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }
    /* This function fetches the latest episodes from a website
  and stores them in an array. */
    static async fetchLatest(): Promise<void> {
        const { data } = await axios.get("https://neko.ketsuna.com");
        const parsedData = /var lastEpisodes = (.+)\;/gm.exec(data);

        let latestEpisodes: LatestEpisode[] = [];
        if (parsedData) latestEpisodes = JSON.parse(parsedData[1]);

        this.latest = latestEpisodes.map(({url_bg, url_image, ...episode}) => {
            return {
                ...episode,
                url_image: buildProxiedUrl("https://neko.ketsuna.com"+url_image.replace("https://neko-sama.fr","")),
                url_bg: buildProxiedUrl("https://neko.ketsuna.com"+url_bg.replace("https://neko-sama.fr","")),
            }
        });
    }

    /* This function converts a string representing an episode
  number to a number data type in TypeScript. */
    static episodeToNumber(episode: string) {
        return Number(episode.replace("Ep. ", ""));
    }

    /* This function retrieves information about an anime based on
  its ID and language, including its synopsis, cover image URL,
  and episodes. */
    static async get(id: string, lang: "vf" | "vostfr"): Promise<undefined | Anime> {
        const anime = this[lang].find((anime) => anime.id.toString() == id);
        if (!anime) return Promise.resolve(undefined);

        const { data: animeHtml } = await axios.get(`https://neko.ketsuna.com/${anime.url.replace("https://neko-sama.fr/", "")}`);
        const synopsis = /(<div class="synopsis">\n<p>\n)(.*)/gm.exec(animeHtml)?.[2];
        const coverUrl = /(<div id="head" style="background-image: url\()(.*)(\);)/gm.exec(animeHtml)?.[2];
        const episodes = load(animeHtml)(".episodes .col-xs-12").map((i, el) => {
            const episode = load(el);
            const episodeNumber = episode("a").text().trimEnd().split(" - ");
            return {
                title: episode("a").text().trimEnd().trimStart(),
                num: this.episodeToNumber(episodeNumber[episodeNumber.length - 1]),
                url: episode("a").attr("href") as string,
                time: "24:00",
                // to get the correct episode number we need to extract this from the text : "title - 01 VOSTFR - 01" // here we need to extract the last number
                episode: this.episodeToNumber(episodeNumber[episodeNumber.length - 1]).toString(),
                url_image: buildProxiedUrl("https://neko.ketsuna.com"+ coverUrl.replace("https://neko-sama.fr","") as string),
                m3u8: "",
            };
        }).get().reverse();
        return { ...anime, synopsis, coverUrl: buildProxiedUrl("https://neko.ketsuna.com/"+ coverUrl.replace("https://neko-sama.fr","")), episodes };
    }

    /* This function retrieves the video URL and subtitle data for a given episode URL. */
    static async getEpisodeVideo(episode: Episode): Promise<undefined | { uri: string; subtitlesVtt: Subtitlesvtt[]; baseUrl: string }> {
        return new Promise(async (resolve) => {
            try{
                const episodeUrl = "https://neko.ketsuna.com" + episode.url.replace("https://neko-sama.fr", "");
            const { data: nekoData } = await axios.get<string>(episodeUrl);
            const pstreamUrl = /(\n(.*)video\[0] = ')(.*)(';)/gm.exec(nekoData)?.[3] as string;
            if (!pstreamUrl) return resolve(undefined);
            const { data: pstreamData } = await axios.get<string>(`https://proxy.ketsuna.com/?url=${encodeURIComponent(pstreamUrl)}`);
            const baseurl = pstreamUrl.split("/").slice(0, 3).join("/");
            const loadedHTML = load(pstreamData);
            const scripts = loadedHTML("script");
            const scriptsSrc = scripts.map((i, el) => loadedHTML(el).attr("src")).get();
            let m3u8Url: string = "",
                subtitlesvtt: Subtitlesvtt[] = [];
            for (const scriptSrc of scriptsSrc) {
                if (scriptSrc.includes("cloudflare-static")) continue;
                const { data: pstreamScript } = await axios.get<string>(`https://proxy.ketsuna.com/?url=${encodeURIComponent(scriptSrc)}`);
                let m3u8UrlB64 = /e.parseJSON\(atob\(t\).slice\(2\)\)\}\(\"([^;]*)"\),/gm.exec(pstreamScript)?.[1] as string;
                if (m3u8UrlB64) {
                    const b64 = JSON.parse(atob(m3u8UrlB64).slice(2));
                    const pstream: PstreamData = b64;
                    m3u8Url = Object.values(pstream).find((data: any) => typeof data === "string" && data.includes(".m3u8")) as string;
                    subtitlesvtt = pstream.subtitlesvtt;
                    break;
                } else {
                    m3u8UrlB64 = /e.parseJSON\(n\)}\(\"([^;]*)"\),/gm.exec(pstreamScript)?.[1] as string;
                    if (m3u8UrlB64) {
                        const b64 = JSON.parse(atob(m3u8UrlB64).slice(2));
                        const pstream: PstreamData = b64;
                        m3u8Url = Object.values(pstream).find((data: any) => typeof data === "string" && data.includes(".m3u8")) as string;
                        subtitlesvtt = pstream.subtitlesvtt;
                        break;
                    } else {
                        m3u8UrlB64 = /n=atob\("([^"]+)"/gm.exec(pstreamScript)?.[1] as string;
                        if (m3u8UrlB64) {
                            const b64 = JSON.parse(
                                atob(m3u8UrlB64)
                                    .replace(/\|\|\|/, "")
                                    .slice(29),
                            );
                            const pstream: PstreamData = b64;
                            m3u8Url = Object.values(pstream).find((data: any) => typeof data === "string" && data.includes(".m3u8")) as string;
                            subtitlesvtt = pstream.subtitlesvtt;
                            break;
                        }
                    }
                }
            }
            if (m3u8Url !== "") {
                resolve({
                    uri: m3u8Url,
                    subtitlesVtt: subtitlesvtt,
                    baseUrl: baseurl,
                });
            } else {
                resolve(undefined);
            }
            }catch(e){
                resolve(undefined);
            }
        });
    }
}
