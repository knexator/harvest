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

/*
space - get card

*/

const CONFIG = {
    board_w: 6,
    board_h: 5,
    max_count: 6,
    veg_hand_size: 6,
    n_types: 4,

    pixel_scaling: 2.5,
    card_s: 70,
    tile_s: 70,
    board_x: 50,
    board_y: 150,
};
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
Shaku.gfx!.setResolution(800, 600, true);
Shaku.gfx!.centerCanvas();
// Shaku.gfx!.maximizeCanvasSize(false, false);

// Loading Screen
Shaku.startFrame();
Shaku.gfx!.clear(Shaku.utils.Color.cornflowerblue);
Shaku.endFrame();

// TYPE DEFINITIONS
enum Veg {
    CABBAGE,
    CARROT,
    KALE,
    POTATO,
    PUMPKIN,
}

type VegTile = false | { vegetable: Veg, count: number, sprite: Sprite };
type VegCard = { vegetable: Veg, count: number, sprite: SpritesGroup };

function randomVeg() {
    return [Veg.CABBAGE, Veg.CARROT, Veg.KALE, Veg.POTATO, Veg.PUMPKIN][randint(CONFIG.n_types)];
}

// LOAD ASSETS
const main_font = await Shaku.assets.loadMsdfFontTexture('fonts/Arial.ttf', { jsonUrl: 'fonts/Arial.json', textureUrl: 'fonts/Arial.png' });

const vegetable_textures: Record<Veg, TextureAsset> = {
    0: await Shaku.assets.loadTexture("imgs/cabbage_04.png"),
    1: await Shaku.assets.loadTexture("imgs/carrot_04.png"),
    2: await Shaku.assets.loadTexture("imgs/kale_04.png"),
    3: await Shaku.assets.loadTexture("imgs/potato_04.png"),
    4: await Shaku.assets.loadTexture("imgs/pumpkin_04.png"),
}

const card_texture = await Shaku.assets.loadTexture("imgs/card.png");

const cursor_default = await Shaku.assets.loadTexture("imgs/cursor_02.png");
const cursor_hover = await Shaku.assets.loadTexture("imgs/hand_open_02.png");
const cursor_grabbed = await Shaku.assets.loadTexture("imgs/hand_closed_02.png");

const hole_texture = await Shaku.assets.loadTexture("imgs/soil_00.png");

// let soundAsset = await Shaku.assets.loadSound('sounds/example_sound.wav');
// let soundInstance = Shaku.sfx!.createSound(soundAsset);

// GAME LOGIC, GLOBAL OBJECTS
let board = Grid2D.init<VegTile>(CONFIG.board_w, CONFIG.board_h, (i, j) => false);
let veg_hand: VegCard[] = [];
for (let k = 0; k < CONFIG.veg_hand_size; k++) {
    addVegCard();
}

let points = 0;

let hovering_card: VegCard | null = null;
let grabbing_card: VegCard | null = null;

let board_floor = Grid2D.init<Sprite>(CONFIG.board_w, CONFIG.board_h, (i, j) => {
    let res = new Sprite(hole_texture);
    res.size.mulSelf(CONFIG.pixel_scaling);
    res.position.set(CONFIG.board_x + i * CONFIG.tile_s, CONFIG.board_y + j * CONFIG.tile_s + CONFIG.pixel_scaling * 4);
    res.static = true;
    return res;
});

const numbers: SpritesGroup[] = [];
for (let k = 0; k < 10; k++) {
    let cur = Shaku.gfx.buildText(main_font, `x${k}`, 10, Color.black);
    cur._sprites.forEach(spr => spr.position.addSelf(1, 1));
    numbers.push(cur);
}

const directions = [Vector2.right, Vector2.down, Vector2.left, Vector2.up];

const cursor_default_spr = new Sprite(cursor_default);
cursor_default_spr.origin = Vector2.zero;
cursor_default_spr.size.mulSelf(1.5);
const cursor_hover_spr = new Sprite(cursor_hover);
cursor_hover_spr.size.mulSelf(1.5);
const cursor_grabbed_spr = new Sprite(cursor_grabbed);
cursor_grabbed_spr.size.mulSelf(1.5);

let cursor_spr = cursor_default_spr;
document.querySelector("canvas")!.style.cursor = "none";

let points_spr: SpritesGroup;
refreshPoints();

const background_color = Color.fromHex("#E4A672");

function addVegCard() {
    let new_veg_card: VegCard = {
        vegetable: randomVeg(),
        count: randint(CONFIG.max_count) + 1,
        sprite: new SpritesGroup(),
    }
    new_veg_card.sprite.add(new Sprite(card_texture));
    new_veg_card.sprite.add(new Sprite(vegetable_textures[new_veg_card.vegetable]));
    new_veg_card.sprite.scale.mulSelf(CONFIG.pixel_scaling);

    // new_veg_card.sprite.position.set(Shaku.gfx.canvas.width / 2, Shaku.gfx.canvas.height * .5);

    new_veg_card.sprite.position.set(Shaku.gfx.canvas.width / 2, Shaku.gfx.canvas.height * 1.25);
    new Animator(new_veg_card.sprite).to({
        "position.x": (veg_hand.length + .5) * (CONFIG.card_s),
        "position.y": CONFIG.card_s * .5
    }).duration(.2).play();

    veg_hand.push(new_veg_card);
}

function posOverCard(pos: Vector2, card: VegCard) {
    return Math.abs(pos.x - card.sprite.position.x) < CONFIG.card_s * .45 && Math.abs(pos.y - card.sprite.position.y) < CONFIG.card_s * .45;
}

function tileUnderPos(pos: Vector2): Vector2 | null {
    let i = Math.floor((pos.x - CONFIG.board_x) / CONFIG.tile_s + .5);
    let j = Math.floor((pos.y - CONFIG.board_y) / CONFIG.tile_s + .5);
    if (i < 0 || i >= CONFIG.board_w || j < 0 || j >= CONFIG.board_h) return null;
    return new Vector2(i, j);
}

function onPlace(pos: Vector2) {
    // todo: plant grow animation

    let connected_group = connectedGroup(pos);
    if (connected_group.length > 1) {
        // todo: anim stuff to points
        points += connected_group.length;
        refreshPoints();
        connected_group.forEach(p => {
            let tile = board.getV(p) as Exclude<VegTile, false>;
            if (tile.count > 1) {
                tile.count -= 1;
                // todo: better anim
                new Animator(tile.sprite).from({ "rotation": Math.PI * 2 }).to({ "rotation": 0 }).duration(.3).play();
            } else {
                board.setV(p, false);
            }
        });
    }
}

function refreshPoints() {
    points_spr = Shaku.gfx.buildText(main_font, `Points: ${points}`, 20, Color.black);
    points_spr.position.set(50, Shaku.gfx.canvas.height * .9);
}

function connectedGroup(pos: Vector2): Vector2[] {
    let tile = board.getV(pos, false);
    if (!tile) return [];

    let group = [pos];
    let pending_expansion = [pos];
    let considered = [pos];
    while (pending_expansion.length > 0) {
        let cur_pos = pending_expansion.shift()!;
        for (let k = 0; k < 4; k++) {
            let cur_neigh_pos = cur_pos.add(directions[k]);
            if (considered.some(v => v.equals(cur_neigh_pos))) continue;
            considered.push(cur_neigh_pos);
            let cur_neigh = board.getV(cur_neigh_pos, null);
            if (cur_neigh && cur_neigh.count === tile.count && cur_neigh.vegetable === tile.vegetable) {
                group.push(cur_neigh_pos);
                pending_expansion.push(cur_neigh_pos);
            }
        }
    }

    return group;
}

// do a single main loop step and request the next step
function step() {
    // start a new frame and clear screen
    Shaku.startFrame();
    Shaku.gfx!.clear(background_color);

    cursor_spr.position.copy(Shaku.input.mousePosition);
    if (!grabbing_card) {
        let cur_hovering_card = veg_hand.find(card => posOverCard(Shaku.input.mousePosition, card)) || null;
        if (!hovering_card) {
            if (cur_hovering_card) {
                hovering_card = cur_hovering_card;
                cursor_spr = cursor_hover_spr;
            }
        } else {
            if (cur_hovering_card !== hovering_card) {
                // end hover
                hovering_card.sprite.rotation = 0;
                hovering_card = null;
                cursor_spr = cursor_default_spr;
            } else {
                hovering_card.sprite.rotation = Math.sin(Shaku.gameTime.elapsed * 5) * .1;
                // maybe grab a card?
                if (Shaku.input.mousePressed()) {
                    grabbing_card = hovering_card;
                    hovering_card = null;
                    cursor_spr = cursor_grabbed_spr;
                }
            }
        }
    } else {
        let hovering_tile = tileUnderPos(Shaku.input.mousePosition);
        if (hovering_tile && board.getV(hovering_tile)) hovering_tile = null;
        if (Shaku.input.mouseReleased()) {
            // stop grabbing
            let card_index = veg_hand.indexOf(grabbing_card);
            if (hovering_tile) {
                let new_veg_tile = {
                    count: grabbing_card.count,
                    vegetable: grabbing_card.vegetable,
                    sprite: new Sprite(vegetable_textures[grabbing_card.vegetable]),
                }
                new_veg_tile.sprite.position.set(CONFIG.board_x + CONFIG.tile_s * hovering_tile.x, CONFIG.board_y + CONFIG.tile_s * hovering_tile.y);
                new_veg_tile.sprite.size.mulSelf(CONFIG.pixel_scaling);
                board.setV(hovering_tile, new_veg_tile);
                onPlace(hovering_tile)
                // todo: card dissapear animation
                veg_hand.splice(card_index, 1);
                veg_hand.forEach((card, k) => {
                    if (k < card_index) return;
                    new Animator(card.sprite).to({
                        "position.x": (k + .5) * (CONFIG.card_s),
                        "position.y": CONFIG.card_s * .5,
                        "rotation": 0,
                    }).duration(.2).play();
                })
            } else {
                new Animator(grabbing_card.sprite).to({
                    "position.x": (card_index + .5) * (CONFIG.card_s),
                    "position.y": CONFIG.card_s * .5,
                    "rotation": 0,
                }).duration(.2).play();
            }
            cursor_spr = cursor_default_spr;
            grabbing_card = null;
        } else {
            grabbing_card.sprite.rotation = Math.sin(Shaku.gameTime.elapsed * 5) * .1;
            grabbing_card.sprite.position.copy(Shaku.input.mousePosition);
        }
    }


    // TODO: remove cheats
    if (Shaku.input.pressed("space")) {
        addVegCard();
    }
    if (Shaku.input.pressed("1") || Shaku.input.pressed("2")) {
        let hovering_tile = tileUnderPos(Shaku.input.mousePosition);
        let delta = Shaku.input.pressed("1") ? -1 : 1
        if (hovering_card) {
            hovering_card.count += delta;
        } else if (grabbing_card) {
            grabbing_card.count += delta;
        } else if (hovering_tile) {
            let asdf = board.getV(hovering_tile);
            if (asdf) {
                asdf.count += delta;
            }
        }
    }
    if (Shaku.input.pressed("3")) {
        let hovering_tile = tileUnderPos(Shaku.input.mousePosition);
        if (hovering_card) {
            veg_hand = veg_hand.filter(x => x !== hovering_card);
            veg_hand.forEach((card, k) => {
                new Animator(card.sprite).to({
                    "position.x": (k + .5) * (CONFIG.card_s),
                    "position.y": CONFIG.card_s * .5,
                    "rotation": 0,
                }).duration(.2).play();
            })
        } else if (grabbing_card) {
            veg_hand = veg_hand.filter(x => x !== grabbing_card);
            veg_hand.forEach((card, k) => {
                new Animator(card.sprite).to({
                    "position.x": (k + .5) * (CONFIG.card_s),
                    "position.y": CONFIG.card_s * .5,
                    "rotation": 0,
                }).duration(.2).play();
            })
        } else if (hovering_tile) {
            board.setV(hovering_tile, false);
        }
    }

    // RENDERING
    board_floor.forEach((i, j, spr) => Shaku.gfx.drawSprite(spr));
    board.forEach((i, j, tile) => {
        if (tile) {
            Shaku.gfx.drawSprite(tile.sprite);
            Shaku.gfx.useEffect(Shaku.gfx.builtinEffects.MsdfFont);
            let cur_num = numbers[tile.count];
            cur_num.position.copy(tile.sprite.position);
            cur_num.rotation = 0;
            cur_num.scale.set(CONFIG.pixel_scaling, CONFIG.pixel_scaling);
            Shaku.gfx.drawGroup(cur_num, false);
            // @ts-ignore
            Shaku.gfx.useEffect(null);
        }
    })
    veg_hand.forEach(card => {
        Shaku.gfx.drawGroup(card.sprite, false);
        Shaku.gfx.useEffect(Shaku.gfx.builtinEffects.MsdfFont);
        let cur_num = numbers[card.count];
        cur_num.position.copy(card.sprite.position);
        cur_num.rotation = card.sprite.rotation;
        cur_num.scale.copy(card.sprite.scale);
        Shaku.gfx.drawGroup(cur_num, false);
        // @ts-ignore
        Shaku.gfx.useEffect(null);
    })

    Shaku.gfx.useEffect(Shaku.gfx.builtinEffects.MsdfFont);
    Shaku.gfx.drawGroup(points_spr, false);
    // @ts-ignore
    Shaku.gfx.useEffect(null);

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

async function loadAsciiTexture(ascii: string, colors: (string | Color)[]): Promise<TextureAsset> {

    let rows = ascii.trim().split("\n").map(x => x.trim())
    console.log(rows)
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
