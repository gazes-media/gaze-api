import { Controller, Get, Param, Query } from '@nestjs/common';
import { AnimesService } from './animes.service';
import { AnimeGenre } from './animes.type';
import { z } from 'zod';

@Controller('animes')
export class AnimesController {
    constructor(private readonly animesService: AnimesService) {}

    @Get()
    findAll(@Query('page') p: number, @Query('genres') g: string, @Query('year') y: number) {
        let genres: undefined | z.infer<typeof AnimeGenre>[] = undefined;
        let negativeGenres: undefined | z.infer<typeof AnimeGenre>[] = undefined;
        let page: undefined | number;
        let start_date_year: undefined | number;

        if (g) {
            const tempGenresArr = g.split(',');

            const tempGenres = tempGenresArr.filter((genre) => !genre.startsWith('!') && AnimeGenre.safeParse(genre).success);
            genres = tempGenres as z.infer<typeof AnimeGenre>[];

            const tempNegativeGenres = tempGenresArr.filter((genre) => genre.startsWith('!') && AnimeGenre.safeParse(genre.slice(0, 1)).success);
            negativeGenres = tempNegativeGenres.map((genre) => genre.slice(0, 1)) as z.infer<typeof AnimeGenre>[];
        }

        if (p) page = p;
        if (y) start_date_year = y;

        return this.animesService.getAnimes({ page, genres, negativeGenres, start_date_year });
    }

    @Get(':id')
    findOne(@Param('id') id: number) {
        console.log(id);
        return this.animesService.getAnime(id);
    }
}