"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KazagumoPlugin = void 0;
const kazagumo_1 = require("kazagumo");
const axios_1 = __importDefault(require("axios"));
const API_URL = "https://api.deezer.com/";
const REGEX = /^https?:\/\/(?:www\.)?deezer\.com\/[a-z]+\/(track|album|playlist)\/(\d+)$/;
class KazagumoPlugin extends kazagumo_1.KazagumoPlugin {
    constructor() {
        super();
        this.methods = {
            track: this.getTrack.bind(this),
            album: this.getAlbum.bind(this),
            playlist: this.getPlaylist.bind(this),
        };
        this.kazagumo = null;
        this._search = null;
    }
    load(kazagumo) {
        this.kazagumo = kazagumo;
        this._search = kazagumo.search.bind(kazagumo);
        kazagumo.search = this.search.bind(this);
    }
    search(query, options) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.kazagumo || !this._search)
                throw new kazagumo_1.KazagumoError(1, 'kazagumo-deezer is not loaded yet.');
            if (!query)
                throw new kazagumo_1.KazagumoError(3, 'Query is required');
            const [, type, id] = REGEX.exec(query) || [];
            const isUrl = /^https?:\/\//.test(query);
            if (type in this.methods) {
                try {
                    const _function = this.methods[type];
                    const result = yield _function(id, options === null || options === void 0 ? void 0 : options.requester);
                    const loadType = type === 'track' ? 'TRACK' : 'PLAYLIST';
                    const playlistName = (_a = result.name) !== null && _a !== void 0 ? _a : undefined;
                    const tracks = result.tracks.filter(this.filterNullOrUndefined);
                    return this.buildSearch(playlistName, tracks, loadType);
                }
                catch (e) {
                    return this.buildSearch(undefined, [], 'SEARCH');
                }
            }
            else if ((options === null || options === void 0 ? void 0 : options.engine) === 'deezer' && !isUrl) {
                const result = yield this.searchTrack(query, options === null || options === void 0 ? void 0 : options.requester);
                return this.buildSearch(undefined, result.tracks, 'SEARCH');
            }
            return this._search(query, options);
        });
    }
    buildSearch(playlistName, tracks = [], type) {
        return {
            playlistName,
            tracks,
            type: type !== null && type !== void 0 ? type : 'TRACK',
        };
    }
    searchTrack(query, requester) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield axios_1.default.get(`${API_URL}/search/track?q=${decodeURIComponent(query)}`)
                .catch((e) => { throw new Error(e); });
            return {
                tracks: res.data.data.map((track) => this.buildKazagumoTrack(track, requester)),
            };
        });
    }
    getTrack(id, requester) {
        return __awaiter(this, void 0, void 0, function* () {
            const track = yield axios_1.default.get(`${API_URL}/track/${id}/`)
                .catch((e) => { throw new Error(e); });
            return { tracks: [this.buildKazagumoTrack(track.data, requester)] };
        });
    }
    getAlbum(id, requester) {
        return __awaiter(this, void 0, void 0, function* () {
            const album = yield axios_1.default.get(`${API_URL}/album/${id}`)
                .catch((e) => { throw new Error(e); });
            const tracks = album.data.tracks.data
                .filter(this.filterNullOrUndefined)
                .map((track) => this.buildKazagumoTrack(track, requester));
            return { tracks, name: album.data.title };
        });
    }
    getPlaylist(id, requester) {
        return __awaiter(this, void 0, void 0, function* () {
            const playlist = yield axios_1.default.get(`${API_URL}/playlist/${id}`)
                .catch((e) => { throw new Error(e); });
            const tracks = playlist.data.tracks.data
                .filter(this.filterNullOrUndefined)
                .map((track) => this.buildKazagumoTrack(track, requester));
            return { tracks, name: playlist.data.title };
        });
    }
    filterNullOrUndefined(obj) {
        return obj !== undefined && obj !== null;
    }
    buildKazagumoTrack(dezzerTrack, requester) {
        return new kazagumo_1.KazagumoTrack({
            track: '',
            info: {
                sourceName: 'deezer',
                identifier: dezzerTrack.id,
                isSeekable: true,
                author: dezzerTrack.artist ? dezzerTrack.artist.name : 'Unknown',
                length: dezzerTrack.duration * 1000,
                isStream: false,
                position: 0,
                title: dezzerTrack.title,
                uri: `https://www.deezer.com/track/${dezzerTrack.id}`,
                thumbnail: dezzerTrack.album ? dezzerTrack.album.cover : ''
            },
        }, requester);
    }
}
exports.KazagumoPlugin = KazagumoPlugin;
