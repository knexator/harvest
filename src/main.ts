import { BlendModes, TextureFilterModes } from "shaku/lib/gfx";
import Shaku from "shaku/lib/shaku";
import TextureAsset from "shaku/lib/assets/texture_asset";
import * as dat from 'dat.gui';
import Color from "shaku/lib/utils/color";
import Sprite from "shaku/lib/gfx/sprite";
import SpritesGroup from "shaku/lib/gfx/sprites_group";
import { Grid2D } from "./grid2D";
import Vector2 from "shaku/lib/utils/vector2";
import Animator from "shaku/lib/utils/animator";
import { PixelEffect } from "./pixel_effect";
import SoundInstance from "shaku/lib/sfx/sound_instance";
import SoundAsset from "shaku/lib/assets/sound_asset";

/*
space - get card

*/

const CONFIG = {
    board_w: 6,
    board_h: 5,
    max_count: 6,
    veg_hand_size: 6,
    n_types: 3,

    card_scaling: 1.15,
    pixel_scaling: 4,
    card_w: 62, // + 10,
    card_h: 92, // + 10,
    card_x: 640,
    board_x: 80,
    board_y: 102 + 10,
};
CONFIG.card_w *= CONFIG.card_scaling;
CONFIG.card_h *= CONFIG.card_scaling;
let gui = new dat.GUI({});
gui.remember(CONFIG);
gui.add(CONFIG, "board_w", 2, 9, 1);
gui.add(CONFIG, "board_h", 2, 9, 1);
gui.add(CONFIG, "max_count", 3, 9, 1);
gui.add(CONFIG, "veg_hand_size", 3, 9, 1);
gui.add(CONFIG, "n_types", 2, 5, 1);
// gui.add(CONFIG, "value_2", -1, 1);
// gui.hide();

// init shaku
Shaku.input.setTargetElement(() => Shaku.gfx.canvas)
await Shaku.init([Shaku.assets, Shaku.sfx, Shaku.gfx, Shaku.input]);

// add shaku's canvas to document and set resolution to 800x600
document.body.appendChild(Shaku!.gfx!.canvas);
Shaku.gfx!.setResolution(700, 660, true);
Shaku.gfx!.centerCanvas();
// Shaku.gfx!.maximizeCanvasSize(false, false);

// Loading Screen
// Shaku.startFrame();
// Shaku.gfx!.clear(Shaku.utils.Color.cornflowerblue);
// Shaku.endFrame();

// TYPE DEFINITIONS
enum Veg {
    CARROT,
    KALE,
    PUMPKIN,
    CAULIFLOWER,
    CABBAGE,
    POTATO,
}

// type VegTile = false | { vegetable: Veg, count: number, sprite: Sprite };
type VegCard = { type: "veg", vegetable: Veg, count: number, sprite: SpritesGroup, watered: boolean };
type CrateCard = { type: "crate", count: number, sprite: SpritesGroup };

type Card = VegCard | CrateCard;

function randomVeg() {
    return [Veg.CARROT, Veg.KALE, Veg.PUMPKIN, Veg.CAULIFLOWER, Veg.CABBAGE, Veg.POTATO][randint(CONFIG.n_types)];
}

let muted = false;

// LOAD ASSETS
class SoundCollection {
    public instances: SoundInstance[]
    constructor(
        sources: SoundAsset[]
    ) {
        this.instances = sources.map(x => Shaku.sfx.createSound(x));
    }

    play(vol: number | null = null) {
        if (muted) return;
        let options = this.instances.filter(x => !x.playing);
        if (options.length === 0) {
            let cur = choice(this.instances)!;
            cur.stop();
            if (vol !== null) {
                cur.volume = vol
            }
            cur.play();
        } else {
            let cur = choice(options)!;
            if (vol !== null) {
                cur.volume = vol
            }
            cur.play();
        }
    }
}

// @ts-ignore
let background_texture = Shaku.assets.loadTexture("imgs/full_board.png").asset;
// @ts-ignore
let note_srcs = ["sounds/note1.wav", "sounds/note2.wav", "sounds/note3.wav", "sounds/note4.wav", "sounds/note5.wav"].map(x => Shaku.assets.loadSound(x).asset);
// @ts-ignore
let note_high_srcs = Array(7).fill(0).map((x, k) => Shaku.assets.loadSound(`sounds/h${k + 1}.wav`).asset);
// @ts-ignore
let note_low_srcs = Array(7).fill(0).map((x, k) => Shaku.assets.loadSound(`sounds/l${k + 1}.wav`).asset);
await Shaku.assets.waitForAll();

// const main_font = await Shaku.assets.loadMsdfFontTexture('fonts/Arial.ttf', { jsonUrl: 'fonts/Arial.json', textureUrl: 'fonts/Arial.png' });

const vegetable_textures: Record<Veg, TextureAsset> = {
    0: await Shaku.assets.loadTexture("imgs/carrot.png"),
    1: await Shaku.assets.loadTexture("imgs/kale.png"),
    2: await Shaku.assets.loadTexture("imgs/pumpkin.png"),
    3: await Shaku.assets.loadTexture("imgs/pumpkin.png"),
    4: await Shaku.assets.loadTexture("imgs/pumpkin.png"),
    5: await Shaku.assets.loadTexture("imgs/pumpkin.png"),
}

const vegetable_card_textures: Record<Veg, TextureAsset> = {
    0: await Shaku.assets.loadTexture("imgs/card_carrot.png"),
    1: await Shaku.assets.loadTexture("imgs/card_kale.png"),
    2: await Shaku.assets.loadTexture("imgs/card_pumpkin.png"),
    3: await Shaku.assets.loadTexture("imgs/card_pumpkin.png"),
    4: await Shaku.assets.loadTexture("imgs/card_pumpkin.png"),
    5: await Shaku.assets.loadTexture("imgs/card_pumpkin.png"),
}

const vegetable_water_card_textures: Record<Veg, TextureAsset> = {
    0: await Shaku.assets.loadTexture("imgs/water_carrot.png"),
    1: await Shaku.assets.loadTexture("imgs/water_kale.png"),
    2: await Shaku.assets.loadTexture("imgs/water_pumpkin.png"),
    3: await Shaku.assets.loadTexture("imgs/water_pumpkin.png"),
    4: await Shaku.assets.loadTexture("imgs/water_pumpkin.png"),
    5: await Shaku.assets.loadTexture("imgs/water_pumpkin.png"),
}

// const card_texture = await Shaku.assets.loadTexture("imgs/card.png");
// const card_carrot_texture = await Shaku.assets.loadTexture("imgs/card_carrot.png");

const cursor_default = await Shaku.assets.loadTexture("imgs/cursor_02.png");
const cursor_hover = await Shaku.assets.loadTexture("imgs/hand_open_02.png");
const cursor_grabbed = await Shaku.assets.loadTexture("imgs/hand_closed_02.png");

// const hole_texture = await Shaku.assets.loadTexture("imgs/soil_00.png");
// const crate_texture = await Shaku.assets.loadTexture("imgs/crate_base.png");
const crate_card_texture = await Shaku.assets.loadTexture("imgs/card_crate.png");

const numbers_texture = await Shaku.assets.loadTexture("imgs/numbers.png");
const score_texture = await Shaku.assets.loadTexture("imgs/score.png");

let note_sound = new SoundCollection(note_srcs);
let note_high_sound = new SoundCollection(note_high_srcs);
let note_low_sound = new SoundCollection(note_low_srcs);

// let soundAsset = await Shaku.assets.loadSound('sounds/example_sound.wav');
// let soundInstance = Shaku.sfx!.createSound(soundAsset);

// GAME LOGIC, GLOBAL OBJECTS
// let crate = {
//     pos: new Vector2(0, 0),
//     count: 4,
//     sprite: new Sprite(crate_texture),
// }
// crate.sprite.size.mulSelf(CONFIG.pixel_scaling);

let board = Grid2D.init<Card | null>(CONFIG.board_w, CONFIG.board_h, (i, j) => null);

/*let crate_pos = new Vector2(0, 0);
{
    let original_crate_card: CrateCard = {
        type: "crate",
        sprite: new SpritesGroup(),
        count: 4,
    }
    let asdf = new Sprite(Shaku.gfx.whiteTexture);
    asdf.size.set(CONFIG.card_w * .9 / CONFIG.pixel_scaling, CONFIG.card_h * .9 / CONFIG.pixel_scaling);
    original_crate_card.sprite.add(asdf);
    original_crate_card.sprite.add(new Sprite(crate_texture));
    original_crate_card.sprite.scale.mulSelf(CONFIG.pixel_scaling);

    original_crate_card.sprite.position.set(CONFIG.board_x + CONFIG.card_w * crate_pos.x, CONFIG.board_y + CONFIG.card_h * crate_pos.y);
    board.setV(crate_pos, original_crate_card);
}*/

// const card_numbers: Sprite[] = [];
// for (let k = 0; k < 10; k++) {
//     let cur = new Sprite(numbers_texture);
//     cur.setSourceFromSpritesheet(new Vector2(k, 0), new Vector2(10, 1), 1, true);
//     card_numbers.push(cur);
//     // let cur = Shaku.gfx.buildText(main_font, k.toString(), 7, Color.black);
//     // cur._sprites.forEach(spr => spr.position.addSelf(-1.5, -9));
//     // numbers.push(cur);
// }

let hand: Card[] = [];
for (let k = 0; k < CONFIG.veg_hand_size; k++) {
    addCard();
}

let points = 0;

let hovering_card: Card | null = null;
let grabbing_card: Card | null = null;

let card_grab_offset = new Vector2(-20, -40).mul(CONFIG.card_scaling);

// let board_floor = Grid2D.init<Sprite>(CONFIG.board_w, CONFIG.board_h, (i, j) => {
//     let res = new Sprite(hole_texture);
//     res.size.mulSelf(CONFIG.pixel_scaling);
//     res.position.set(CONFIG.board_x + i * CONFIG.card_w, CONFIG.board_y + j * CONFIG.card_h + CONFIG.pixel_scaling * 4);
//     res.static = true;
//     return res;
// });

const DIRS = [Vector2.right, Vector2.down, Vector2.left, Vector2.up];

let hover_offset = 0;

const pixel_effect = Shaku.gfx.createEffect(PixelEffect);

let particles: Sprite[] = [];

const cursor_default_spr = new Sprite(cursor_default);
cursor_default_spr.origin = Vector2.zero;
cursor_default_spr.size.mulSelf(CONFIG.pixel_scaling);
const cursor_hover_spr = new Sprite(cursor_hover);
cursor_hover_spr.size.mulSelf(CONFIG.pixel_scaling);
const cursor_grabbed_spr = new Sprite(cursor_grabbed);
cursor_grabbed_spr.size.mulSelf(CONFIG.pixel_scaling);

let cursor_spr = cursor_default_spr;

let points_pos = new Vector2(Shaku.gfx.canvas.width * .75, Shaku.gfx.canvas.height * .9);
let points_spr: SpritesGroup;
refreshPoints();

let background_sprite = new Sprite(background_texture);
background_sprite.origin.set(0, 0);

function baseCardPos(index: number) {
    return new Vector2(CONFIG.card_x, CONFIG.board_y + CONFIG.card_h * index);
}

function addCard() {
    // todo: remove hack
    if (Math.random() < .991 && hand.every(x => x.type !== "crate")) {
        addCrateCard();
    } else {
        addVegCard();
    }
}

function addCrateCard() {
    let new_crate_card: CrateCard = {
        type: "crate",
        sprite: new SpritesGroup(),
        count: 1 + randint(CONFIG.max_count),
    }
    let card_spr = new Sprite(crate_card_texture);
    new_crate_card.sprite.add(card_spr);
    let number_spr = new Sprite(numbers_texture).clone();
    new_crate_card.sprite.add(number_spr);
    updateCountSprite(new_crate_card);
    new_crate_card.sprite.scale.mulSelf(CONFIG.card_scaling);

    new_crate_card.sprite.position.set(Shaku.gfx.canvas.width / 2, Shaku.gfx.canvas.height * 1.25);
    new Animator(new_crate_card.sprite).to({
        "position": baseCardPos(hand.length)
    }).duration(.2).play();

    hand.push(new_crate_card);
}

function updateCountSprite(card: Card) {
    card.sprite._sprites[1].setSourceFromSpritesheet(new Vector2(card.count, 0), new Vector2(10, 1), 1, true)
    card.sprite._sprites[1].position.set(.5, -20);
    if (card.count === 1) {
        card.sprite._sprites[1].position.x += .5;
    }
}

function addVegCard() {
    let new_veg_card: VegCard = {
        type: "veg",
        vegetable: randomVeg(),
        count: randint(CONFIG.max_count) + 1,
        sprite: new SpritesGroup(),
        watered: false,
    }
    let card_spr = new Sprite(vegetable_card_textures[new_veg_card.vegetable]);
    new_veg_card.sprite.add(card_spr);
    let number_spr = new Sprite(numbers_texture).clone();
    new_veg_card.sprite.add(number_spr);
    updateCountSprite(new_veg_card);
    new_veg_card.sprite.scale.mulSelf(CONFIG.card_scaling);

    new_veg_card.sprite.position.set(Shaku.gfx.canvas.width / 2, Shaku.gfx.canvas.height * 1.25);
    new Animator(new_veg_card.sprite).to({
        "position": baseCardPos(hand.length)
    }).duration(.2).play();

    hand.push(new_veg_card);
}

function posOverCard(pos: Vector2, card: Card) {
    return Math.abs(pos.x - card.sprite.position.x) < CONFIG.card_w * .45 && Math.abs(pos.y - card.sprite.position.y) < CONFIG.card_h * .45;
}

function tileUnderPos(pos: Vector2): Vector2 | null {
    pos = pos.add(card_grab_offset);
    let i = (pos.x - CONFIG.board_x) / CONFIG.card_w + .5;
    let j = (pos.y - CONFIG.board_y) / CONFIG.card_h + .8;
    // if (Math.abs((i % 1) - .5) > .4 || Math.abs((j % 1) - .5) > .4) return null;
    i = Math.floor(i);
    j = Math.floor(j);
    if (i < 0 || i >= CONFIG.board_w || j < 0 || j >= CONFIG.board_h) return null;
    return new Vector2(i, j);
}

function createScoreSprite(card: Exclude<VegCard, false>, index: number, crate_pos: Vector2 | null, extra_delay: number) {
    let veg_sprite = new Sprite(vegetable_textures[card.vegetable]);
    veg_sprite.setSourceFromSpritesheet(Vector2.zero, Vector2.one, 1, true);
    veg_sprite.origin.set(.5, 1);
    veg_sprite.size.mulSelf(CONFIG.card_scaling);
    veg_sprite.position.copy(card.sprite.position.add(0, CONFIG.card_scaling * 30));
    particles.push(veg_sprite);

    let original_size = veg_sprite.size.clone();
    let p0 = veg_sprite.position.clone() as Vector2;
    let pE = (crate_pos === null) ? points_pos : crate_pos;
    let p1 = Vector2.lerp(p0, pE, .5);
    p1.addSelf(Vector2.random.mulSelf(100)).addSelf(-200, -200);
    new Animator(veg_sprite).onUpdate((t: number) => {
        veg_sprite.position.copy(bezier3((1 - (1 - t) * (1 - t)) / 2 + t / 2, p0, p1, pE));
        veg_sprite.size = original_size.mul((t + .5) * (t - 1.35) * -2.5);
    }).duration(.40).delay((extra_delay + .1 + index * .1) / .40).play().then(() => {
        particles = particles.filter(x => x != veg_sprite);
    });

    // note_sound.play();
    sizeBumpAnim(card.sprite, extra_delay + .1 + index * .1);
}

function activateCard(pos: Vector2, crate_pos: Vector2 | null, extra_delay: number) {
    let connected_group = connectedGroup(pos);
    if (connected_group.length > 1) {
        // todo: anim stuff to points
        points += connected_group.length;
        refreshPoints();
        connected_group.forEach((p, index) => {
            let tile = board.getV(p) as Exclude<VegCard, false>;
            createScoreSprite(tile, index, crate_pos, extra_delay);
            if (tile.count > 1) {
                new Animator(tile.sprite).to({ "rotation": tile.sprite.rotation * (-.9 + Math.random() * .2) })
                    .delay((extra_delay + .1 + index * .1) / .05).duration(.05).play().then(() => {
                        tile.count -= 1;
                        updateCountSprite(tile);
                    });
            } else {
                new Animator(tile.sprite).to({ "position": tile.sprite.position.add(0, Shaku.gfx.canvas.height) }).smoothDamp(true)
                    .duration(.35).delay((extra_delay + .3 + index * .1) / .35).play().then(() => {
                        board.setV(p, null);
                    });
            }
        });
        return connected_group;
    }
    return connected_group;
}

function onPlaceCard(pos: Vector2) {
    note_low_sound.play(1.);
    let placed = board.getV(pos);
    if (!placed) throw new Error("couldn't get the card placed just now");
    if (placed.type === "veg") {
        activateCard(pos, null, 0);
    } else if (placed.type === "crate") {
        let delay = 0;
        let rotation = placed.sprite.rotation;
        let seen: Vector2[] = [];
        for (let k = 0; k < 4; k++) {
            let cur_pos = pos.add(DIRS[k]);
            if (seen.some(x => x === cur_pos)) continue;
            let tile = board.getV(cur_pos, null);
            if (tile && tile.count === placed.count) {
                let new_seen = activateCard(cur_pos, placed.sprite.position, delay);
                if (new_seen.length > 1) {
                    new Animator(placed.sprite)
                        .to({ "rotation": rotation * (-.9 + Math.random() * .2) })
                        .delay((delay) / .05).duration(.05).play();
                    rotation *= -1;
                    delay += .5;
                    seen = seen.concat(new_seen);
                }
            }
        }
    }
}

function refreshPoints() {
    // todo: draw points
    // points_spr = Shaku.gfx.buildText(main_font, `Points: ${points}`, 20, Color.black);
    // points_spr.position.copy(points_pos);
}

function connectedGroup(pos: Vector2): Vector2[] {
    let tile = board.getV(pos, false);
    if (!tile || tile.type !== "veg") return [];

    let group = [pos];
    let pending_expansion = [pos];
    let considered = [pos];
    while (pending_expansion.length > 0) {
        let cur_pos = pending_expansion.shift()!;
        for (let k = 0; k < 4; k++) {
            let cur_neigh_pos = cur_pos.add(DIRS[k]);
            if (considered.some(v => v.equals(cur_neigh_pos))) continue;
            considered.push(cur_neigh_pos);
            let cur_neigh = board.getV(cur_neigh_pos, null);
            if (cur_neigh && cur_neigh.type === "veg" && cur_neigh.count === tile.count && cur_neigh.vegetable === tile.vegetable) {
                group.push(cur_neigh_pos);
                pending_expansion.push(cur_neigh_pos);
            }
        }
    }

    return group;
}

function sizeBumpAnim(spr: SpritesGroup, delay: number = 0) {
    let original_scale = spr.scale.clone();
    new Animator(spr).from({ "scale": original_scale.mul(1.1) }).to({ "scale": original_scale })
        .duration(.07).delay(delay / .07).play();
}

function makeWaterVersion(card: VegCard) {
    card.count += 1;
    card.watered = true;
    updateCountSprite(card);
    card.sprite._sprites[0].texture = vegetable_water_card_textures[card.vegetable];
    sizeBumpAnim(card.sprite);
    setTimeout(() => {
        card.sprite._sprites[0].texture = vegetable_card_textures[card.vegetable];
    }, 100)
}

function makeUnwaterVersion(card: VegCard) {
    card.count -= 1;
    card.watered = false;
    updateCountSprite(card);
    // card.sprite._sprites[0].texture = vegetable_water_card_textures[card.vegetable];
    sizeBumpAnim(card.sprite);
    // setTimeout(() => {
    //     card.sprite._sprites[0].texture = vegetable_card_textures[card.vegetable];
    // }, 100)
}

// let intro_time_left = -1;
let in_intro = true;

let last_hovering_tile: Vector2 | null = null;

// do a single main loop step and request the next step
function step() {
    // start a new frame and clear screen
    Shaku.startFrame();
    Shaku.gfx.drawSprite(background_sprite);

    cursor_spr.position.copy(Shaku.input.mousePosition);
    if (!in_intro) {
        if (!grabbing_card) {
            let cur_hovering_card = hand.find(card => posOverCard(Shaku.input.mousePosition, card)) || null;
            if (!hovering_card) {
                if (cur_hovering_card) {
                    hovering_card = cur_hovering_card;
                    sizeBumpAnim(hovering_card.sprite);
                    note_high_sound.play(.4);
                    hover_offset = Shaku.gameTime.elapsed;
                    cursor_spr = cursor_hover_spr;
                }
            } else {
                if (cur_hovering_card !== hovering_card) {
                    // end hover
                    new Animator(hovering_card.sprite).to({ rotation: 0 }).duration(.05).play();
                    hovering_card = null;
                    cursor_spr = cursor_default_spr;
                } else {
                    hovering_card.sprite.rotation = Math.sin((Shaku.gameTime.elapsed - hover_offset) * 5) * .1;
                    // maybe grab a card?
                    if (Shaku.input.mousePressed()) {
                        grabbing_card = hovering_card;
                        hovering_card = null;
                        cursor_spr = cursor_grabbed_spr;
                        note_high_sound.play(1.);
                    }
                }
            }
        } else {
            let hovering_tile = tileUnderPos(Shaku.input.mousePosition);
            if (hovering_tile && board.getV(hovering_tile)) hovering_tile = null;

            if (grabbing_card.type === "veg" && grabbing_card.watered && (hovering_tile === null || (hovering_tile.x !== 0 && hovering_tile.y !== 0))) {
                // unwater
                makeUnwaterVersion(grabbing_card);
            }

            if (hovering_tile) {
                if (last_hovering_tile === null || !last_hovering_tile.equals(hovering_tile)) {
                    note_low_sound.play(.3);
                    if (grabbing_card.type === "veg" && !grabbing_card.watered && (hovering_tile.x === 0 || hovering_tile.y === 0)) {
                        // water
                        makeWaterVersion(grabbing_card);
                    }
                }
                if (grabbing_card.type === "veg") {
                    board.setV(hovering_tile, grabbing_card);
                    let connected_group = connectedGroup(hovering_tile);
                    if (connected_group.length > 1) {
                        connected_group.forEach((p, index) => {
                            let tile = board.getV(p) as Exclude<VegCard, false>;
                            tile.sprite.rotation += Math.sin(index * .7 + Shaku.gameTime.elapsed * 10) * Shaku.gameTime.delta * .5;
                            tile.sprite.rotation *= .99;
                        });
                    }
                    board.setV(hovering_tile, null);
                } else if (grabbing_card.type === "crate") {
                    // todo: juice for crates
                }
            }
            last_hovering_tile = hovering_tile;
            if (Shaku.input.mouseReleased()) {
                // stop grabbing
                let card_index = hand.indexOf(grabbing_card);
                if (hovering_tile) {
                    // let new_veg_tile = {
                    //     count: grabbing_card.count,
                    //     vegetable: grabbing_card.vegetable,
                    //     sprite: new Sprite(vegetable_textures[grabbing_card.vegetable]),
                    // }
                    grabbing_card.sprite.position.set(CONFIG.board_x + CONFIG.card_w * hovering_tile.x, CONFIG.board_y + CONFIG.card_h * hovering_tile.y);
                    // new_veg_tile.sprite.size.mulSelf(CONFIG.pixel_scaling);
                    board.setV(hovering_tile, grabbing_card);
                    onPlaceCard(hovering_tile);
                    // todo: card dissapear animation
                    hand.splice(card_index, 1);
                    hand.forEach((card, k) => {
                        if (k < card_index) return;
                        new Animator(card.sprite).to({
                            "position": baseCardPos(k),
                            "rotation": 0,
                        }).duration(.2).play();
                    });
                    if (hand.length === 1) {
                        for (let k = 1; k < CONFIG.veg_hand_size; k++) {
                            setTimeout(() => {
                                addCard();
                            }, k * 250);
                        }
                    }
                } else {
                    new Animator(grabbing_card.sprite).to({
                        "position": baseCardPos(card_index),
                        "rotation": 0,
                    }).duration(.2).play();
                }
                cursor_spr = cursor_default_spr;
                grabbing_card = null;
            } else {
                grabbing_card.sprite.rotation = Math.sin((Shaku.gameTime.elapsed - hover_offset) * 5) * .1;
                // grabbing_card.sprite.position.copy(Shaku.input.mousePosition.add(card_grab_offset));
                if (hovering_tile) {
                    let board_pos = new Vector2(CONFIG.board_x + CONFIG.card_w * hovering_tile.x, CONFIG.board_y + CONFIG.card_h * hovering_tile.y);
                    grabbing_card.sprite.position.copy(
                        Vector2.lerp(board_pos, Shaku.input.mousePosition.add(card_grab_offset), .1)
                    );
                } else {
                    grabbing_card.sprite.position.copy(Shaku.input.mousePosition.add(card_grab_offset));
                }
            }
        }

        // TODO: remove cheats
        if (Shaku.input.pressed("space")) {
            addCard();
        }
        if (Shaku.input.pressed("1") || Shaku.input.pressed("2")) {
            let hovering_tile = tileUnderPos(Shaku.input.mousePosition);
            let delta = Shaku.input.pressed("1") ? -1 : 1
            if (hovering_card) {
                // @ts-ignore
                hovering_card.count += delta;
                updateCountSprite(hovering_card);
            } else if (grabbing_card) {
                // @ts-ignore
                grabbing_card.count += delta;
                updateCountSprite(grabbing_card);
            } else if (hovering_tile) {
                let asdf = board.getV(hovering_tile);
                if (asdf) {
                    // @ts-ignore
                    asdf.count += delta;
                    updateCountSprite(asdf);
                }
            }
        }
        if (Shaku.input.pressed("3")) {
            let hovering_tile = tileUnderPos(Shaku.input.mousePosition);
            if (hovering_card) {
                hand = hand.filter(x => x !== hovering_card);
                hand.forEach((card, k) => {
                    new Animator(card.sprite).to({
                        "position": baseCardPos(k),
                        "rotation": 0,
                    }).duration(.2).play();
                })
            } else if (grabbing_card) {
                hand = hand.filter(x => x !== grabbing_card);
                hand.forEach((card, k) => {
                    new Animator(card.sprite).to({
                        "position": baseCardPos(k),
                        "rotation": 0,
                    }).duration(.2).play();
                })
            } else if (hovering_tile) {
                board.setV(hovering_tile, null);
            }
        }
    } else {
        // if (intro_time_left < 0) {
        if (Shaku.input.mouseDown()) {
            // intro_time_left = 1;
            let children = document.querySelector("#intro")!.childNodes;
            // @ts-ignore
            children.forEach(x => x.className = "animating");
            document.querySelector("canvas")!.style.cursor = "none";

            in_intro = false;
            setTimeout(() => {
                document.getElementById("intro")!.style.display = "none";
            }, 1000);
        }
        /*} else {
            intro_time_left = moveTowards(intro_time_left, 0, Shaku.gameTime.delta);
            if (intro_time_left === 0) {
                in_intro = false;
            }
        }*/
    }

    // RENDERING
    Shaku.gfx.useEffect(pixel_effect);
    // board_floor.forEach((i, j, spr) => Shaku.gfx.drawSprite(spr));
    board.forEach((i, j, tile) => {
        if (tile) {
            Shaku.gfx.drawGroup(tile.sprite, false);
            /*Shaku.gfx.useEffect(Shaku.gfx.builtinEffects.MsdfFont);
            let cur_num = numbers[tile.count];
            cur_num.position.copy(tile.sprite.position);
            cur_num.rotation = 0;
            cur_num.scale.set(CONFIG.pixel_scaling, CONFIG.pixel_scaling);
            Shaku.gfx.drawGroup(cur_num, false);
            Shaku.gfx.useEffect(pixel_effect);*/
        }
    })
    hand.forEach(card => {
        Shaku.gfx.drawGroup(card.sprite, false);
        /*Shaku.gfx.useEffect(Shaku.gfx.builtinEffects.MsdfFont);
        let cur_num = numbers[card.count];
        cur_num.position.copy(card.sprite.position);
        cur_num.rotation = card.sprite.rotation;
        // cur_num.scale.copy(card.sprite.scale);
        cur_num.scale.set(CONFIG.pixel_scaling, CONFIG.pixel_scaling);
        Shaku.gfx.drawGroup(cur_num, false);
        Shaku.gfx.useEffect(pixel_effect);*/
    })
    particles.forEach(x => {
        Shaku.gfx.drawSprite(x);
    });

    // Shaku.gfx.useEffect(Shaku.gfx.builtinEffects.MsdfFont);
    // Shaku.gfx.drawGroup(points_spr, false);
    // Shaku.gfx.useEffect(pixel_effect);

    cursor_spr.position.copy(Shaku.input.mousePosition);
    Shaku.gfx.drawSprite(cursor_spr);

    // Shaku.gfx!.drawSprite(sprite);
    // if (Shaku.input!.pressed("a")) {
    //     soundInstance.play();
    // }

    // Shaku.gfx!.drawSprite(sprite2);

    // end frame and request next step
    Shaku.endFrame();
    Shaku.requestAnimationFrame(step);
}

// start main loop
step();

// GENERAL INTEREST FUNCTIONS

function randint(n_options: number) {
    return Math.floor(Math.random() * n_options);
}

function mod(n: number, m: number) {
    return ((n % m) + m) % m;
}

function moveTowards(cur_val: number, target_val: number, max_delta: number): number {
    if (target_val > cur_val) {
        return Math.min(cur_val + max_delta, target_val);
    } else if (target_val < cur_val) {
        return Math.max(cur_val - max_delta, target_val);
    } else {
        return target_val;
    }
}

// from https://stackoverflow.com/questions/6711707/draw-a-quadratic-b%C3%A9zier-curve-through-three-given-points
function bezier3(t: number, p0: Vector2, p1: Vector2, p2: Vector2) {
    let result = p2.mul(t * t);
    result.addSelf(p1.mul(2 * t * (1 - t)));
    result.addSelf(p0.mul((1 - t) * (1 - t)));
    return result;
}

function choice<T>(arr: T[]) {
    if (arr.length === 0) {
        return undefined
    }
    return arr[Math.floor(Math.random() * arr.length)];
}

async function loadAsciiTexture(ascii: string, colors: (string | Color)[]): Promise<TextureAsset> {

    let rows = ascii.trim().split("\n").map(x => x.trim())
    let height = rows.length
    let width = rows[0].length

    // create render target
    // @ts-ignore
    let renderTarget = await Shaku.assets.createRenderTarget(null, width, height, 4);

    // use render target
    Shaku.gfx!.setRenderTarget(renderTarget, false);

    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            let val = rows[j][i];
            if (val === '.' || val === ' ') continue;
            let n = parseInt(val);

            let col = colors[n];
            if (typeof col === 'string') {
                col = Shaku.utils.Color.fromHex(col);
            }
            Shaku.gfx!.fillRect(
                new Shaku.utils.Rectangle(i, height - j - 1, 1, 1),
                col,
                BlendModes.Opaque, 0
            );
        }
    }

    // reset render target
    // @ts-ignore
    Shaku.gfx!.setRenderTarget(null, false);

    return renderTarget;
}
