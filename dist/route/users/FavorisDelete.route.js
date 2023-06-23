"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UserFavorisDeleteRoute", {
    enumerable: true,
    get: function() {
        return UserFavorisDeleteRoute;
    }
});
var _Route = require("../Route");
var _datasource = require("../../data-source");
var _User = require("../../entity/User");
function _assert_this_initialized(self) {
    if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }
    return self;
}
function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _get_prototype_of(o) {
    _get_prototype_of = Object.setPrototypeOf ? Object.getPrototypeOf : function getPrototypeOf(o) {
        return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _get_prototype_of(o);
}
function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function");
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {
        constructor: {
            value: subClass,
            writable: true,
            configurable: true
        }
    });
    if (superClass) _set_prototype_of(subClass, superClass);
}
function _possible_constructor_return(self, call) {
    if (call && (_type_of(call) === "object" || typeof call === "function")) {
        return call;
    }
    return _assert_this_initialized(self);
}
function _set_prototype_of(o, p) {
    _set_prototype_of = Object.setPrototypeOf || function setPrototypeOf(o, p) {
        o.__proto__ = p;
        return o;
    };
    return _set_prototype_of(o, p);
}
function _type_of(obj) {
    "@swc/helpers - typeof";
    return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj;
}
function _is_native_reflect_construct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;
    try {
        Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {}));
        return true;
    } catch (e) {
        return false;
    }
}
function _create_super(Derived) {
    var hasNativeReflectConstruct = _is_native_reflect_construct();
    return function _createSuperInternal() {
        var Super = _get_prototype_of(Derived), result;
        if (hasNativeReflectConstruct) {
            var NewTarget = _get_prototype_of(this).constructor;
            result = Reflect.construct(Super, arguments, NewTarget);
        } else {
            result = Super.apply(this, arguments);
        }
        return _possible_constructor_return(this, result);
    };
}
var UserFavorisDeleteRoute = /*#__PURE__*/ function(Route) {
    "use strict";
    _inherits(UserFavorisDeleteRoute, Route);
    var _super = _create_super(UserFavorisDeleteRoute);
    function UserFavorisDeleteRoute() {
        _class_call_check(this, UserFavorisDeleteRoute);
        var _this;
        _this = _super.apply(this, arguments);
        _define_property(_assert_this_initialized(_this), "url", "/users/favoris");
        _define_property(_assert_this_initialized(_this), "method", "DELETE");
        _define_property(_assert_this_initialized(_this), "handler", function(request, reply) {
            // get body from request
            var _request_body = request.body, id = _request_body.id, user = _request_body.user;
            if (!id) {
                return reply.status(400).send({
                    error: "Anime id is required."
                });
            }
            _datasource.AppDataSource.getRepository(_User.User).save({
                googleId: user.uid
            }).then(function(u) {
                _datasource.AppDataSource.getRepository(_User.Favoris).findOne({
                    where: {
                        user: {
                            googleId: user.uid
                        },
                        animeId: id
                    },
                    loadRelationIds: true
                }).then(function(f) {
                    if (f) {
                        _datasource.AppDataSource.getRepository(_User.Favoris).delete(f).then(function(deleted) {
                            if (deleted.affected === 0) return reply.status(404).send({
                                success: false,
                                error: "Anime not found in favoris"
                            });
                            return reply.send({
                                success: true,
                                deleted: true
                            });
                        });
                    } else {
                        return reply.status(404).send({
                            success: false,
                            error: "Anime not found in favoris"
                        });
                    }
                });
            });
        });
        return _this;
    }
    return UserFavorisDeleteRoute;
}(_Route.Route);
