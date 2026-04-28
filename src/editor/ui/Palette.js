///////////////////////////////////
//  Blocks Categories Palettes
///////////////////////////////////

import ScratchJr from '../ScratchJr';
import Block from '../blocks/Block';
import BlockSpecs from '../blocks/BlockSpecs';
import ScriptsPane from './ScriptsPane';
import Undo from './Undo';
import OS from '../../tablet/OS';
import MediaLib from '../../tablet/MediaLib';
import Events from '../../utils/Events';
import Rectangle from '../../geom/Rectangle';
import DrawPath from '../../utils/DrawPath';
import Localization from '../../utils/Localization';
import ScratchAudio from '../../utils/ScratchAudio';
import Record from './Record';
import {
    frame, gn, localx, newHTML, newButton, scaleMultiplier, isTablet, newDiv,
    setProps, globalx, localy, globaly, drawScaled, newCanvas,
    setCanvasSize, hitRect, writeText, getStringSize
} from '../../utils/lib';
import { makeSemanticButton, moveFocusByKey, setPressedState } from '../../utils/accessibility';
import UI from './UI';


let blockscale = 0.75;
let numcat = 0; // getter
let betweenblocks = undefined; // Set in setup()
let blockdy = 5;
let timeoutid = undefined;
let helpballoon = undefined;
let dxblocks = 10;

const MARTY_SENSOR_BLOCKS = new Set([
    'martycoloursensed',
    'martyobstaclesensed',
    'martylightsensed',
    'martynoisesensed'
]);
const BLOCKS_WITH_ARGS = new Set(['playsnd', 'gotopage', 'playusersnd', 'setcolor', 'onmessage', 'message', 'setspeed']);
const LOOP_BLOCKS = new Set(['repeat']);

let currentCategorySide = 'left';

const CATEGORY_LABELS = {
    'sprite-start': 'BLOCKS_TRIGGERING_BLOCKS',
    'sprite-motion': 'BLOCKS_MOTION_BLOCKS',
    'sprite-looks': 'BLOCKS_LOOKS_BLOCKS',
    'sprite-sound': 'BLOCKS_SOUND_BLOCKS',
    'sprite-flow': 'BLOCKS_CONTROL_BLOCKS',
    'sprite-stop': 'BLOCKS_END_BLOCKS',
    'marty-start': 'BLOCKS_TRIGGERING_BLOCKS',
    'marty-motion': 'BLOCKS_MOTION_BLOCKS',
    'marty-looks': 'BLOCKS_LOOKS_BLOCKS',
    'marty-sound': 'BLOCKS_SOUND_BLOCKS',
    'marty-flow': 'BLOCKS_CONTROL_BLOCKS',
    'marty-stop': 'BLOCKS_END_BLOCKS',
    'cog-start': 'BLOCKS_TRIGGERING_BLOCKS',
    'cog-looks': 'BLOCKS_LOOKS_BLOCKS',
    'cog-sound': 'BLOCKS_SOUND_BLOCKS'
};

export default class Palette {
    static get numcat() {
        return numcat;
    }

    static get helpballoon() {
        return helpballoon;
    }

    static set helpballoon(newHelpballoon) {
        helpballoon = newHelpballoon;
    }


    static recreateCategories() {
        Palette.recreateLeftCategory();
        // Palette.recreateRightCategory(); // Hidden: hardware device categories not used

        Palette.selectCategory(0);
    }

    static recreateLeftCategory() {
        /* This function is called when the Marty mode is toggled to reset the palette and show the appropriate blocks */
        // Destroy the old Right Category selectors
        const selectorsLeft = gn('selectors');
        if (selectorsLeft) {
            selectorsLeft.parentElement.removeChild(selectorsLeft);
        }

        // Create the new Right Category selectors
        Palette.createCategorySelectors(Palette.parent);

        // Palette.recreateRightCategory(); // Hidden: hardware device categories not used
    }

    static recreateRightCategory() {
        /* This function is called when the Marty mode is toggled to reset the palette and show the appropriate blocks */
        // Destroy the old Right Category selectors
        const selectorsRight = gn('selectorsright');
        if (selectorsRight) {
            selectorsRight.parentElement.removeChild(selectorsRight);
        }

        // Create the new Right Category selectors
        // Palette.createCategorySelectorsRight(Palette.parent); // Hidden: hardware device categories not used
    }

    static setup(parent) {
        Palette.parent = parent;
        blockscale *= scaleMultiplier;
        blockdy *= scaleMultiplier;
        Palette.blockdx *= scaleMultiplier; // XXX
        betweenblocks = 90 * blockscale;
        Palette.createCategorySelectors(parent);
        // Palette.createCategorySelectorsRight(parent); // Hidden: hardware device categories not used
        var div = newHTML('div', 'palette', parent);
        div.setAttribute('id', 'palette');
        div.setAttribute('role', 'group');
        div.setAttribute('aria-label', UI.getGuideControlLabel('INTERFACE_GUIDE_BLOCKS_PALETTE'));
        div.style["touch-action"] = "none";
        // div.ontouchstart = function (evt) {
        //     Palette.paletteMouseDown(evt);
        // };
        // div.onmousedown = function (evt) {
        //     Palette.paletteMouseDown(evt);
        // };
        div.onpointerdown = function (evt) {
            Palette.paletteMouseDown(evt);
        }
        var pc = newHTML('div', 'papercut', parent);
        newHTML('div', 'withstyle', pc);
    }

    static createCategorySelectors(parent) {
        var sel = newHTML('div', 'categoryselector', parent);
        sel.setAttribute('id', 'selectors');
        sel.setAttribute('role', 'toolbar');
        sel.setAttribute('aria-label', UI.getGuideControlLabel('INTERFACE_GUIDE_BLOCKS_CATEGORIES'));
        var bkg = newHTML('div', 'catbkg', sel);
        newHTML('div', 'catimage', bkg);
        var leftPx = 15 * scaleMultiplier;
        var widthPx = 54 * scaleMultiplier;
        /*MartyMode*/
        const categoriesLeft = ScratchJr.isMartyModeEnabled ? BlockSpecs.categoriesMarty : BlockSpecs.categories;
        for (var i = 0; i < categoriesLeft.length; i++) {
            Palette.createSelector(sel, i, leftPx + i * widthPx, 0, categoriesLeft[i]);
        }
    }

    static createCategorySelectorsRight(parent) {
        var sel = newHTML('div', 'categoryselectorright', parent);
        sel.setAttribute('id', 'selectorsright');
        sel.setAttribute('role', 'toolbar');
        sel.setAttribute('aria-label', UI.getGuideControlLabel('INTERFACE_GUIDE_BLOCKS_CATEGORIES'));
        var bkg = newHTML('div', 'catbkg', sel);
        newHTML('div', 'catimage', bkg);
        var leftPx = 15 * scaleMultiplier;
        var widthPx = 54 * scaleMultiplier;
        /*MartyMode*/
        const leftCategoriesLength = ScratchJr.isMartyModeEnabled ? BlockSpecs.categoriesMarty.length : BlockSpecs.categories.length;
        for (var i = 0; i < BlockSpecs.categoriesCog.length; i++) {
            Palette.createSelector(sel, leftCategoriesLength + i, leftPx + i * widthPx, 0, BlockSpecs.categoriesCog[i]);
        }
    }

    static paletteMouseDown(e) {
        if (isTablet && e.touches && (e.touches.length > 1)) {
            return;
        }
        if (ScratchJr.onHold) {
            return;
        }
        e.preventDefault();
        ScratchJr.blur();
        var pal = gn('palette');
        var spt = Events.getTargetPoint(e);
        var pt = {
            x: localx(pal, spt.x),
            y: localy(pal, spt.y)
        };
        for (var i = 0; i < pal.childElementCount; i++) {
            var ths = pal.childNodes[i];
            if (!hitRect(ths, pt)) {
                continue;
            }
            if (ScratchJr.shaking && (ScratchJr.shaking == ths)) {
                Palette.removeSound(ths);
            } else {
                Events.startDrag(e, ths, Palette.prepareForDrag,
                    Palette.dropBlockFromPalette, ScriptsPane.draggingBlock, Palette.showHelp, Palette.startShaking);
            }
        }
        ScratchJr.clearSelection();
    }

    static isRecorded(ths) {
        var val = ths.owner.getArgValue();
        var list = ScratchJr.getActiveScript().owner.spr.sounds;
        return list.indexOf(val) > 0;
    }

    static removeSound(ths) {
        ScratchAudio.sndFX('cut.wav');
        var indx = ths.owner.getArgValue();
        var spr = ScratchJr.getSprite();
        if (!spr) {
            return;
        }
        var page = spr.div.parentNode.owner;
        var sounds = spr.sounds.concat();
        if (indx >= sounds.length) {
            return;
        }
        sounds.splice(indx, 1);
        spr.sounds = sounds;
        // recreate the sprite scripts to make sure deleted sound is properly treated
        var sprdata = spr.getData();
        var div = gn(spr.id + '_scripts');
        while (div.childElementCount > 0) {
            div.removeChild(div.childNodes[0]);
        }
        var sc = div.owner;
        var list = sprdata.scripts;
        for (var j = 0; j < list.length; j++) {
            sc.recreateStrip(list[j]);
        }
        Undo.record({
            action: 'deletesound',
            who: spr.id,
            where: page.id,
            sound: name
        });
        ScratchJr.storyStart('Palette.removeSound'); // Record a change for sample projects in story-starter mode

        Palette.selectCategory(3);
    }

    static showHelp(e, b) {
        var block = b.owner;
        var help = BlockSpecs.blockDesc(block, ScratchJr.getSprite());
        var str = help[block.blocktype];
        if (!str) {
            return;
        }
        Palette.openPaletteBalloon(b, str);
        timeoutid = setTimeout(Palette.closeHelpBalloon, 2000);
    }

    static startShaking(b) {
        if (!b.owner) {
            return;
        }
        if (b.owner.blocktype != 'playusersnd') {
            Palette.showHelp(null, b); return;
        }
        ScratchJr.shaking = b;
        ScratchJr.stopShaking = Palette.stopShaking;
        b.setAttribute('class', 'shakeme');
        newHTML('div', 'deletesound', b);
    }

    static clickBlock(e, b) {
        if (ScratchJr.shaking && (b == ScratchJr.shaking)) {
            Palette.removeSound(b);
        } else {
            ScratchJr.clearSelection();
            Palette.showHelp(e, b);
        }
    }

    static stopShaking(b) {
        if (!b.owner) {
            return;
        }
        ScratchJr.shaking = undefined;
        ScratchJr.stopShaking = undefined;
        b.setAttribute('class', '');
        var ic = b.childNodes[b.childElementCount - 1];
        if (ic.getAttribute('class') == 'deletesound') {
            b.removeChild(ic);
        }
    }

    static openPaletteBalloon(obj, label) {
        if (helpballoon) {
            Palette.closeHelpBalloon();
        }
        var fontSize = Math.floor(14 * window.devicePixelRatio * scaleMultiplier);
        var w = window.devicePixelRatio * 80 * scaleMultiplier;
        var h = window.devicePixelRatio * 36 * scaleMultiplier;
        var dy = globaly(obj) - 36 * scaleMultiplier;
        helpballoon = newCanvas(frame, 0, dy, w, h, {
            position: 'absolute',
            zIndex: 1000
        });
        helpballoon.icon = obj;
        var ctx = helpballoon.getContext('2d');
        w = 16 * window.devicePixelRatio * scaleMultiplier +
            getStringSize(ctx, 'bold ' + fontSize + 'px ' + window.Settings.paletteBalloonFont, label).width;
        if (w < 36 * scaleMultiplier) {
            w = 36 * scaleMultiplier;
        }
        var dx = (globalx(obj) + (obj.offsetWidth / 2)) * window.devicePixelRatio - (w / 2);
        setCanvasSize(helpballoon, w, h);
        setProps(helpballoon.style, {
            position: 'absolute',
            webkitTransform: 'translate(' + (-w / 2) + 'px, ' + (-h / 2) + 'px) ' +
                'scale(' + (1 / window.devicePixelRatio) + ') translate(' + (dx + (w / 2)) + 'px, ' + (h / 2) + 'px)'
        });
        Palette.drawBalloon(helpballoon.getContext('2d'), w, h);
        writeText(ctx, 'bold ' + fontSize + 'px ' + window.Settings.paletteBalloonFont, 'white', label,
            21 * window.devicePixelRatio * scaleMultiplier, 8 * window.devicePixelRatio * scaleMultiplier);
    }

    static hide() {
        gn('blockspalette').querySelector('#selectors').style.display = 'none';
        var sr = gn('blockspalette').querySelector('#selectorsright');
        if (sr) sr.style.display = 'none';
    }

    static show() {
        gn('blockspalette').querySelector('#selectors').style.display = 'inline-block';
        var sr = gn('blockspalette').querySelector('#selectorsright');
        if (sr) sr.style.display = 'inline-block';
    }


    static closeHelpBalloon() {
        if (timeoutid) {
            clearTimeout(timeoutid);
        }
        if (helpballoon) {
            helpballoon.parentNode.removeChild(helpballoon);
        }
        helpballoon = undefined;
        timeoutid = undefined;
    }

    static drawBalloon(ctx, w, h) {
        var curve = 4;
        var path = new Array(['M', 0, curve], ['q', 0, -curve, curve, -curve], ['h', w - curve * 2],
            ['q', curve, 0, curve, curve], ['v', h - 11 - curve * 2], ['q', 0, curve, -curve, curve],
            ['h', -(w / 2) + curve + 11], ['l', -11, 11], ['l', -11, -11], ['h', -(w / 2) + curve + 11],
            ['q', -curve, 0, -curve, -curve], ['z']
        );
        ctx.clearRect(0, 0, Math.max(ctx.canvas.width, w), Math.max(ctx.canvas.height, h));
        ctx.fillStyle = '#4682B5';
        ctx.lineWidth = 2;
        //ctx.strokeStyle = 'rgba(242,243,242,0.4)';
        ctx.beginPath();
        DrawPath.render(ctx, path);
        ctx.fill();
        //  ctx.stroke();
    }

    static prepareForDrag(e) {
        e.preventDefault();
        ScratchAudio.sndFX('grab.wav');
        if (!ScratchJr.runtime.inactive()) {
            ScratchJr.stopStrips();
        }
        var sc = ScratchJr.getActiveScript().owner;
        sc.flowCaret = null;
        var pt = Events.getTargetPoint(e);
        Events.dragmousex = pt.x;
        Events.dragmousey = pt.y;
        if (!Events.dragthumbnail.parentNode) { // palette has been removed programatically
            Events.dragthumbnail = Palette.getBlockNamed(Events.dragthumbnail.owner.blocktype);
            if (!Events.dragthumbnail) {
                Events.cancelAll();
                return;
            }
        }
        var mx = Events.dragmousex - frame.offsetLeft - localx(Events.dragthumbnail, Events.dragmousex);
        var my = Events.dragmousey - frame.offsetTop - localy(Events.dragthumbnail, Events.dragmousey);
        Events.dragcanvas = Events.dragthumbnail.owner.duplicateBlock(mx, my, sc.spr).div;
        Events.dragcanvas.style.zIndex = ScratchJr.dragginLayer;
        Events.dragDiv.appendChild(Events.dragcanvas);
        // Events.dragcanvas.owner.lift();
        sc.dragList = [Events.dragcanvas.owner];
        sc.prepareCaret(Events.dragcanvas.owner);
    }

    static getBlockNamed(str) {
        var pal = gn('palette');
        for (var i = 0; i < pal.childElementCount; i++) {
            if (pal.childNodes[i].owner.blocktype == str) {
                return pal.childNodes[i];
            }
        }
        return null;
    }

    static createSelector(parent, n, dx, dy, spec) {
        var pxWidth = 51 * scaleMultiplier;
        var pxHeight = 57 * scaleMultiplier;
        var div = newButton('category-selector-button', parent, {
            ariaLabel: Palette.getCategoryLabel(spec[3])
        });
        setProps(div.style, {
            position: 'absolute',
            left: dx + 'px',
            top: dy + 'px',
            width: pxWidth + 'px',
            height: pxHeight + 'px',
            lineHeight: '0px',
            overflow: 'hidden'
        });
        div.setAttribute('id', spec[3]);
        div.setAttribute('aria-controls', 'palette');
        div.index = n;
        var officon = spec[1].cloneNode(true);
        officon.width = pxWidth;
        officon.height = pxHeight;
        officon.alt = '';
        officon.setAttribute('aria-hidden', 'true');
        div.appendChild(officon);
        setProps(officon.style, {
            position: 'absolute',
            left: '0px',
            top: '0px',
            display: 'block',
            zIndex: 6,
            visibility: 'visible',
            pointerEvents: 'none'
        });
        var onicon = spec[0].cloneNode(true);
        onicon.width = pxWidth;
        onicon.height = pxHeight;
        onicon.alt = '';
        onicon.setAttribute('aria-hidden', 'true');
        div.appendChild(onicon);
        div.bkg = spec[2];
        setProps(onicon.style, {
            position: 'absolute',
            left: '0px',
            top: '0px',
            display: 'block',
            zIndex: 8,
            visibility: 'hidden',
            pointerEvents: 'none'
        });
        setPressedState(div, false);
        div.onclick = function (evt) {
            Palette.clickOnCategory(evt);
        };
        div.onkeydown = Palette.handleCategoryKeyDown;
    }

    static getPaletteSize() {
        var first = gn('palette').childNodes[0];
        var last = gn('palette').childNodes[gn('palette').childElementCount - 1];
        return last.offsetLeft + last.offsetWidth - first.offsetLeft;
    }

    static clickOnCategory(e) {
        if (!e) {
            return;
        }
        e.preventDefault();
        ScratchJr.unfocus(e);
        var t = e.currentTarget || e.target.closest('button');
        if (!t) {
            return;
        }
        ScratchAudio.sndFX('keydown.wav');
        Palette.selectCategory(t.index);
    }

    static getCategoryButtons() {
        var buttons = [];
        ['selectors', 'selectorsright'].forEach((id) => {
            var container = gn(id);
            if (!container) {
                return;
            }
            for (var i = 1; i < container.childElementCount; i++) {
                buttons.push(container.childNodes[i]);
            }
        });
        return buttons;
    }

    static getCategoryLabel(categoryId) {
        var key = CATEGORY_LABELS[categoryId];
        return key ? Localization.localize(key) : categoryId;
    }

    static getPaletteFocusableElements() {
        var palette = gn('palette');
        if (!palette) {
            return [];
        }
        return Array.from(palette.childNodes).filter((element) => {
            if (!element || !element.matches || element.getAttribute('role') !== 'button') {
                return false;
            }
            var style = window.getComputedStyle(element);
            return style.display !== 'none' && style.visibility !== 'hidden';
        }).sort((a, b) => a.offsetLeft - b.offsetLeft);
    }

    static handleCategoryKeyDown(event) {
        moveFocusByKey(event, Palette.getCategoryButtons(), event.currentTarget, {
            horizontal: true,
            vertical: false
        });
    }

    static handlePaletteBlockKeyDown(event) {
        moveFocusByKey(event, Palette.getPaletteFocusableElements(), event.currentTarget, {
            horizontal: true,
            vertical: false
        });
    }

    static getPaletteBlockLabel(block) {
        if (!block) {
            return '';
        }
        var help = BlockSpecs.blockDesc(block, ScratchJr.getSprite());
        return help[block.blocktype] || block.blocktype;
    }

    static decoratePaletteBlock(blockDiv) {
        if (!blockDiv || !blockDiv.owner) {
            return;
        }
        blockDiv.classList.add('paletteblock');
        makeSemanticButton(blockDiv, {
            label: Palette.getPaletteBlockLabel(blockDiv.owner),
            onActivate: function (event) {
                Palette.insertBlockFromKeyboard(blockDiv, event);
            }
        });
        blockDiv.onkeydown = Palette.handlePaletteBlockKeyDown;
    }

    static encodePaletteBlock(block) {
        var arg = (block.arg != null) || BLOCKS_WITH_ARGS.has(block.blocktype) ? block.getArgValue() : null;
        if (!arg && (arg !== 0)) {
            arg = 'null';
        }
        var data = [[block.blocktype, arg, 0, 0]];
        if (LOOP_BLOCKS.has(block.blocktype)) {
            data[0].push([]);
        }
        return data;
    }

    static getKeyboardInsertionPoint(scriptElement) {
        var point = {
            x: 24,
            y: 24
        };
        if (!scriptElement || !scriptElement.owner) {
            return point;
        }
        var topBlocks = scriptElement.owner.gettopblocks();
        if (topBlocks.length < 1) {
            return point;
        }
        var maxBottom = point.y;
        for (var i = 0; i < topBlocks.length; i++) {
            var connectedBlocks = scriptElement.owner.findingGroup([], topBlocks[i]);
            for (var j = 0; j < connectedBlocks.length; j++) {
                maxBottom = Math.max(maxBottom,
                    (connectedBlocks[j].div.top + connectedBlocks[j].div.offsetHeight) / scaleMultiplier);
            }
        }
        point.y = maxBottom + 24;
        return point;
    }

    static insertBlockFromKeyboard(blockElement, event) {
        if (!blockElement || !blockElement.owner) {
            return;
        }
        var sc = ScratchJr.getActiveScript();
        if (!sc) {
            return;
        }
        if (!ScratchJr.runtime.inactive()) {
            ScratchJr.stopStrips();
        }
        ScratchJr.unfocus(event);
        ScriptsPane.cleanCarets();
        var point = Palette.getKeyboardInsertionPoint(sc);
        var strip = Palette.encodePaletteBlock(blockElement.owner);
        strip[0][2] = point.x;
        strip[0][3] = point.y;
        var inserted = sc.owner.insertKeyboardBlock(sc.owner.getKeyboardTargetStrip(), strip);
        if (!inserted) {
            inserted = sc.owner.insertKeyboardBlock(null, strip);
        }
        if (!inserted) {
            return;
        }
        if (ScriptsPane.scroll) {
            ScriptsPane.scroll.adjustCanvas();
            ScriptsPane.scroll.refresh();
            ScriptsPane.scroll.bounceBack();
        }
        if (window.tutorialEngine) {
            window.tutorialEngine.evaluateScriptsArea();
        }
        var spr = sc.owner.spr;
        Undo.record({
            action: 'scripts',
            where: spr.div.parentNode.owner.id,
            who: spr.id
        });
        OS.analyticsEvent('editor', 'new_block_' + blockElement.owner.blocktype);
        ScratchJr.storyStart('Palette.insertBlockFromKeyboard');
        ScratchAudio.sndFX('snap.wav');
        blockElement.focus();
    }

    static selectCategory(n) {
        var div = gn('selectors');
        // if the number is greater than the number of categories (in the left categories div), then it is in the right categories div
        const rightDiv = gn('selectorsright');
        const isRightCategories = rightDiv && n >= div.childNodes.length - 1;
        n = isRightCategories ? n - (div.childNodes.length - 1) : n;
        div = isRightCategories ? rightDiv : gn('selectors');
        currentCategorySide = isRightCategories ? 'right' : 'left';
        // set the icons for text or sprite
        numcat = n;
        var currentSel = div.childNodes[n + 1];
        for (var i = 1; i < div.childElementCount; i++) {
            var sel = div.childNodes[i];
            const selIndex = isRightCategories ? sel.index - (gn('selectors').childNodes.length - 1) : sel.index;
            sel.childNodes[0].style.visibility = (selIndex != n) ? 'visible' : 'hidden';
            sel.childNodes[1].style.visibility = (selIndex == n) ? 'visible' : 'hidden';
            setPressedState(sel, selIndex == n);
        }
        // set to hidden the selectors for the other side categories
        const otherSideDiv = isRightCategories ? gn('selectors') : rightDiv;
        if (otherSideDiv) {
            for (var i = 1; i < otherSideDiv.childElementCount; i++) {
                var sel = otherSideDiv.childNodes[i];
                sel.childNodes[0].style.visibility = 'visible';
                sel.childNodes[1].style.visibility = 'hidden';
                setPressedState(sel, false);
            }
        }

        var pal = gn('palette');
        gn('blockspalette').style.background = currentSel.bkg;
        while (pal.childElementCount > 0) {
            pal.removeChild(pal.childNodes[0]);
        }
        if (!ScratchJr.getSprite()) {
            return;
        }
        /*MartyMode*/
        let pallets = isRightCategories ? BlockSpecs.palettesCog : BlockSpecs.palettes;
        if (!isRightCategories && ScratchJr.isMartyModeEnabled) {
            pallets = BlockSpecs.palettesMarty;
        }
        var list = (pallets[n]).concat();
        if (!isRightCategories && ScratchJr.isMartyModeEnabled) {
            list = Palette.applyMartySensorVisibility(list);
        }
        var dx = dxblocks;
        if (isRightCategories) {
            dx = gn('palette').offsetWidth - 90;
        }
        for (var k = 0; k < list.length; k++) {
            // if is the right categories, then we need to align the blocks to the right.
            // to do so, we need to change the dx value to be the width of the palette minus the width of the block
            // and the betweenblocks value to be negative
            if (list[k] == 'space') {
                if (isRightCategories) {
                    dx -= 30 * blockscale;
                } else {
                    dx += 30 * blockscale;
                }
            } else {
                var newb = Palette.newScaledBlock(pal, list[k],
                    ((list[k] == 'repeat') ? 0.65 * scaleMultiplier : blockscale), dx, blockdy);
                newb.lift();
                if (isRightCategories) {
                    dx -= betweenblocks;
                } else {
                    dx += betweenblocks;
                }
            }
        }
        dx += 30;
        let categoriesLength = isRightCategories ? BlockSpecs.categoriesCog.length : BlockSpecs.categories.length;
        /*MartyMode*/
        if (!isRightCategories && ScratchJr.isMartyModeEnabled) {
            categoriesLength = BlockSpecs.categoriesMarty.length;
        }
        if (!isRightCategories && (n == (categoriesLength - 1)) && (ScratchJr.stage.pages.length > 1)) {
            Palette.addPagesBlocks(dx);
        }
        // TODO: they hard coded n==3 to be sound, but we don't want the sound blocks for alpha release
        // need to clean this up before we re-add in the sound blocks
        /*MartyMode*/
        if (!isRightCategories && !ScratchJr.isMartyModeEnabled && (n == 3) && (ScratchJr.getSprite().sounds.length > 0)) {
            Palette.addSoundsBlocks(dxblocks);
        }
    }

    static applyMartySensorVisibility(blockNames) {
        const manager = window.martyManager;
        if (!manager || typeof manager.getVisibleMartySensorBlocks !== 'function') {
            return blockNames;
        }
        const visibleBlocks = manager.getVisibleMartySensorBlocks();
        if (!visibleBlocks || visibleBlocks.length === 0) {
            return blockNames.filter((blockName) => !MARTY_SENSOR_BLOCKS.has(blockName));
        }
        const visibleSet = new Set(visibleBlocks);
        return blockNames.filter((blockName) => {
            if (!MARTY_SENSOR_BLOCKS.has(blockName)) {
                return true;
            }
            return visibleSet.has(blockName);
        });
    }

    static refreshMartySensorBlocks() {
        if (!ScratchJr.isMartyModeEnabled) {
            return;
        }
        if (currentCategorySide !== 'left') {
            return;
        }
        Palette.selectCategory(numcat);
    }

    static reset() {
        Palette.selectCategory(0);
    }

    static showSelectors(b) {
        var n = numcat;
        var div = gn('selectors');
        for (var i = 0; i < div.childElementCount; i++) {
            var sel = div.childNodes[i];
            sel.childNodes[0].style.visibility = (sel.index != n) && b ? 'visible' : 'hidden';
            sel.childNodes[1].style.visibility = (sel.index == n) && b ? 'visible' : 'hidden';
            sel.childNodes[2].style.visibility = (sel.index != n) && b ? 'visible' : 'hidden';
            sel.childNodes[3].style.visibility = (sel.index == n) && b ? 'visible' : 'hidden';
        }
    }

    static addPagesBlocks(dx) {
        var pal = gn('palette');
        var spec = BlockSpecs.defs.gotopage;
        for (var i = 0; i < ScratchJr.stage.pages.length; i++) {
            if (ScratchJr.stage.pages[i].id == ScratchJr.stage.currentPage.id) {
                continue;
            }
            spec[4] = i + 1;
            var newb = Palette.newScaledBlock(pal, 'gotopage', blockscale, dx, blockdy);
            newb.lift();
            dx += betweenblocks + 5;
        }
    }

    static addSoundsBlocks(dx) {
        var pal = gn('palette');
        var spr = ScratchJr.getSprite();
        var list = spr ? spr.sounds : [];
        for (var i = 0; i < list.length; i++) {
            var op = (MediaLib.sounds.indexOf(list[i]) < 0) ? 'playusersnd' : 'playsnd';
            var val = (MediaLib.sounds.indexOf(list[i]) < 0) ? i : list[i];
            var newb = Palette.addBlockSound(pal, op, val, dx, blockdy);
            newb.lift();
            dx += betweenblocks;
        }
        console.log("should be adding record sound");
        if ((list.length < 6) && Record.available) {
            Palette.drawRecordSound(newb.div.offsetWidth, newb.div.offsetHeight, dx);
        }
    }

    static addBlockSound(parent, op, val, dx, dy) {
        var spec = BlockSpecs.defs[op];
        var old = spec[4];
        spec[4] = val;
        var newb = Palette.newScaledBlock(parent, op, blockscale, dx, dy);
        spec[4] = old;
        return newb;
    }

    static drawRecordSound(w, h, dx) {
        var pal = gn('palette');
        var div = newDiv(pal, dx, 0, w, h, {
            top: (6 * scaleMultiplier) + 'px'
        });
        div.classList.add('paletteRecordButton');
        var cnv = newCanvas(div, 0, 0,
            div.offsetWidth * window.devicePixelRatio,
            div.offsetHeight * window.devicePixelRatio,
            {
                webkitTransform: 'translate(' +
                    (-div.offsetWidth * window.devicePixelRatio / 2) + 'px, ' +
                    (-div.offsetHeight * window.devicePixelRatio / 2) + 'px) ' +
                    'scale(' + (1 / window.devicePixelRatio) + ') translate(' +
                    (div.offsetWidth * window.devicePixelRatio / 2) + 'px, ' +
                    (div.offsetHeight * window.devicePixelRatio / 2) + 'px)'
            }
        );
        if (BlockSpecs.mic.complete) {
            drawScaled(BlockSpecs.mic, cnv);
        } else {
            BlockSpecs.mic.onload = function () {
                drawScaled(BlockSpecs.mic, cnv);
            };
        }
        makeSemanticButton(div, {
            label: Localization.localize('A11Y_RECORD'),
            onActivate: Palette.recordSound
        });
        div.onkeydown = Palette.handlePaletteBlockKeyDown;
        // div.ontouchstart = Palette.recordSound;
        // div.onmousedown = Palette.recordSound;
        if (isTablet) {
            div.ontouchstart = Palette.recordSound;
        } else {
            div.onpointerdown = Palette.recordSound;
        }
    }

    static recordSound(e) {
        e.preventDefault();
        e.stopPropagation();
        ScratchJr.clearSelection();
        Record.appear();
    }

    static inStatesPalette() {
        var div = gn('selectors');
        var sel = div.childNodes[div.childElementCount - 1];
        return sel.childNodes[0].style.visibility == 'hidden';
    }

    // move to scratch jr app
    static getLandingPlace(el, e, scale) {
        scale = typeof scale !== 'undefined' ? scale : 1;
        var sc = ScratchJr.getActiveScript().owner;
        var pt = e ? Events.getTargetPoint(e) : null;
        if (pt && !pt.x) {
            pt = null;
        }
        var box = new Rectangle(el.left / scale, el.top / scale, el.offsetWidth / scale, el.offsetHeight / scale);
        var box2 = new Rectangle(globalx(gn('palette')), globaly(gn('palette')),
            gn('palette').offsetWidth, gn('palette').offsetHeight);
        if ((sc.flowCaret != null) && ((sc.flowCaret.prev != null) ||
            (sc.flowCaret.next != null) || (sc.flowCaret.inside != null))) {
            return 'scripts';
        }
        if (box2.overlapElemBy(box, 0.4) && box2.hitRect({ x: el.left / scale, y: el.top / scale })) {
            return 'palette';
        }
        if (pt && box2.hitRect(pt)) {
            return 'palette';
        }
        if (Palette.overlapsWith(gn('scripts'), box)) {
            return 'scripts';
        }
        if (Palette.overlapsWith(gn('palette'), box)) {
            return 'palette';
        }
        if (Palette.overlapsWith(gn('library'), box)) {
            return 'library';
        }
        if (Palette.overlapsWith(gn('pages'), box)) {
            return 'pages';
        }
        return null;
    }

    static overlapsWith(el, box) {
        var box2 = new Rectangle(globalx(el), globaly(el), el.offsetWidth, el.offsetHeight);
        return box.intersects(box2);
    }

    static overlapsWith2(el, box) {
        var box2 = new Rectangle(el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight);
        return box.intersects(box2);
    }

    static getBlockfromChild(div) {
        while (div != null) {
            if (div.owner) {
                return div;
            }
            div = div.parentNode;
        }
        return null;
    }

    static getHittedThumb(el, div, scale) {
        scale = typeof scale !== 'undefined' ? scale : 1;
        var box1 = new Rectangle(el.left / scale, el.top / scale, el.offsetWidth / scale, el.offsetHeight / scale);
        var area = 0;
        var res = null;
        var dh = div.parentNode.scrollTop;
        for (var i = 0; i < div.childElementCount; i++) {
            var node = div.childNodes[i];
            if (node.nodeName == 'FORM') {
                continue;
            }
            var box2 = new Rectangle(globalx(node, node.offsetLeft), globaly(node, node.offsetTop) - dh,
                node.offsetWidth, node.offsetHeight);
            var boxi = box1.intersection(box2);
            var a = boxi.width * boxi.height;
            if (a > area) {
                area = a;
                res = node;
            }
        }
        return res;
    }

    //////////////////////////////////////
    //  Palette Block
    /////////////////////////////////////

    static newScaledBlock(parent, op, scale, dx, dy) {
        var bbx = new Block(BlockSpecs.defs[op], true, scale);
        bbx.div.setAttribute('id', op+"_block");
        bbx.div.setAttribute('data-blocktype', op);
        setProps(bbx.div.style, {
            position: 'absolute',
            left: dx + 'px',
            top: dy + 'px'
        });
        parent.appendChild(bbx.div);
        Palette.decoratePaletteBlock(bbx.div);
        return bbx;
    }

    static dropBlockFromPalette(e, element) {
        e.preventDefault();
        switch (Palette.getLandingPlace(element, e)) {
            case 'scripts':
                OS.analyticsEvent('editor', 'new_block_' + element.owner.blocktype);
                var sc = ScratchJr.getActiveScript();
                var dx = localx(sc, element.left);
                var dy = localy(sc, element.top);
                ScriptsPane.blockDropped(sc, dx, dy);
                var spr = ScratchJr.getActiveScript().owner.spr;
                Undo.record({
                    action: 'scripts',
                    where: spr.div.parentNode.owner.id,
                    who: spr.id
                });
                // Record a change for sample projects in story-starter mode
                ScratchJr.storyStart('Palette.dropBlockFromPalette');
                break;
            default:
                ScratchJr.getActiveScript().owner.deleteBlocks();
                break;
        }
        ScratchJr.getActiveScript().owner.dragList = [];
    }
}

if (typeof window !== 'undefined') {
    window.Palette = Palette;
}
