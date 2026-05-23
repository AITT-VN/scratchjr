import BlockSpecs from './BlockSpecs';
import {scaleMultiplier, setProps, setCanvasSize, newHTML, isTablet,
    newDiv, getDocumentHeight, drawThumbnail, frame, globalx, globaly} from '../../utils/lib';
import Path from '../../painteditor/Path';

let openMenu = undefined;

export default class Menu {
    static get openMenu () {
        return openMenu;
    }

    static set openMenu (newOpenMenu) {
        openMenu = newOpenMenu;
    }

    static openDropDown (b, fcn) {
        Menu.removeStaleMenus();
        var size = 50;
        var color = b.owner.blocktype == 'setspeed' ? 'orange' : 'yellow';
        if (b.owner.spec[9]) {
            color = b.owner.spec[9]; // menu colour
        }
        var list = JSON.parse(b.owner.arg.list);
        var num = b.owner.arg.numperrow;
        var p = b.parentNode;
        var dh = size * Math.round(list.length / num);
        var rows = list.length / num;
        var w = size * list.length / rows;
        var scaledWidth = w * scaleMultiplier;
        var dx = b.left + (b.offsetWidth - scaledWidth) / 2;
        if ((dx + scaledWidth) > p.width) {
            dx -= ((dx + scaledWidth) - p.width);
        }
        if (dx < 5) {
            dx = 5;
        }
        dx += globalx(p, 0);
        var dy = b.top + b.offsetHeight - ((10 + 18) * scaleMultiplier) + globaly(p, 0);
        if ((dy + ((10 + dh) * scaleMultiplier)) > getDocumentHeight()) {
            dy = getDocumentHeight() - ((15 + dh) * scaleMultiplier);
        }
        var mu = newDiv(frame, dx, dy, w, dh, {
            position: 'absolute',
            zIndex: 100000,
            webkitTransform: 'translate(' + (-w / 2) + 'px,' + (-dh / 2) + 'px) ' +
                'scale(' + scaleMultiplier + ', ' + scaleMultiplier + ') ' +
                'translate(' + (w / 2) + 'px, ' + (dh / 2) + 'px)'
        });
        mu.setAttribute('class', 'menustyle ' + color);
        mu.active = b;
        mu.onpointerdown = function (evt) {
            if (evt.target === mu) {
                Menu.closeMyOpenMenu();
            }
        };
        for (var i = 0; i < list.length; i++) {
            Menu.addImageToDropDown(mu, list[i], b, fcn);
        }
        openMenu = mu;
    }

    static removeStaleMenus () {
        var stale = document.querySelectorAll('.menustyle');
        for (var i = 0; i < stale.length; i++) {
            if (stale[i].parentNode) {
                stale[i].parentNode.removeChild(stale[i]);
            }
        }
        openMenu = undefined;
    }

    static addImageToDropDown (mu, c, block, fcn) {
        var img = BlockSpecs.getImageFrom('assets/blockicons/' + c, 'svg');
        var cs = newHTML('div', 'ddchoice', mu);
        var micon = newHTML('canvas', undefined, cs);
        var iconSize = 42;
        var scaledIconSize = iconSize * window.devicePixelRatio;
        setCanvasSize(micon, scaledIconSize, scaledIconSize);
        setProps(micon.style, {
            webkitTransform: 'translate(' + (-scaledIconSize / 2) + 'px, ' + (-scaledIconSize / 2) + 'px) ' +
                'scale(' + (1 / window.devicePixelRatio) + ', ' + (1 / window.devicePixelRatio) + ') ' +
                'translate(' + (scaledIconSize / 2) + 'px, ' + (scaledIconSize / 2) + 'px)'
        });
        if (!img.complete) {
            img.onload = function () {
                drawThumbnail(img, micon);
            };
        } else {
            drawThumbnail(img, micon);
        }
        cs.ontouchstart = function (evt) {
            handleTouchStart(evt);
        };
        cs.onmouseover = function (evt) {
            Path.highlightDot(evt);
        };
        cs.onmouseout = function (evt) {
            Path.unhighlightDot(evt);
        };
        cs.onpointerdown = function (evt) {
            fcn(evt, mu, block, c);
        };
        function handleTouchStart (e) {
            if (isTablet && e.touches && (e.touches.length > 1)) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            fcn(e, mu, block, c);
        }
    }

    static closeMyOpenMenu () {
        if (!openMenu) {
            return;
        }
        openMenu.parentNode.removeChild(openMenu);
        openMenu = undefined;
    }
}
