//////////////////////////////////////////////////
// Home Screen
//////////////////////////////////////////////////

import Lobby from "./Lobby";
import OS from "../tablet/OS";
import IO from "../tablet/IO";
import Project from "../editor/ui/Project";
import Localization from "../utils/Localization";
import ScratchAudio from "../utils/ScratchAudio";
import Vector from "../geom/Vector";
import { gn, newHTML, newButton, isTablet } from "../utils/lib";
import goToLink from "../utils/goToLink";

let frame;
let scrollvalue;
let version;
let timeoutEvent;

export default class Home {
  static init() {
    version = Lobby.version;
    frame = gn("htmlcontents");
    var inner = newHTML("div", "inner", frame);
    var div = newHTML("div", "scrollarea", inner);
    div.setAttribute("id", "scrollarea");
    if ('ontouchstart' in window) {
      frame.ontouchstart = Home.handleTouchStart;
      frame.ontouchend = Home.handleTouchEnd;
    } else {
      frame.onpointerdown = Home.handleTouchStart;
      frame.onpointerup = Home.handleTouchEnd;
    }
    Home.displayYourProjects();
    Home.renderBuildInfo();
  }

  static renderBuildInfo() {
    if (gn("buildinfo")) return;
    var commit = typeof __BUILD_COMMIT__ !== "undefined" ? __BUILD_COMMIT__ : "dev";
    var iso = typeof __BUILD_DATE__ !== "undefined" ? __BUILD_DATE__ : "";
    var when = "";
    if (iso) {
      var d = new Date(iso);
      if (!isNaN(d.getTime())) {
        var pad = function (n) { return String(n).padStart(2, "0"); };
        when = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())
          + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
      }
    }
    var info = document.createElement("div");
    info.id = "buildinfo";
    info.textContent = "build " + commit + (when ? " · " + when : "");
    info.style.cssText = "position:fixed;bottom:4px;right:6px;font:10px/1 monospace;color:#888;opacity:0.6;pointer-events:none;z-index:9999;user-select:text;";
    document.body.appendChild(info);
  }

  ////////////////////////////
  // Home Screen
  ////////////////////////////

  static emptyProjectThumbnail(parent) {
    var tb = newHTML("div", "projectthumb", parent);
    newHTML("div", "aproject empty", tb);
    tb.id = "newproject";
    Home.addCardActionButton(
      tb,
      "card-action-open",
      Localization.localize("A11Y_CREATE") + " " + Localization.localize("NEW_PROJECT_PREFIX"),
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        Home.performActionForTarget(tb, "project");
      }
    );
  }

  //////////////////////////
  // Events
  //////////////////////////

  static handleTouchStart(e) {
    // // On my android tablet, when touching a project,
    // // the tablet triggers the mousedown event
    // // after touchstart event about 600ms
    // // --Donald
    // if (performingAction) {
    //     return;
    // }
    // performingAction = true;
    // setTimeout(function () {
    //     performingAction = false;
    // }, 1000);
    Home.dragging = false;
    Home.holding = false;
    // if ((t.nodeName == "INPUT") || (t.nodeName == "FORM")) return;
    var mytarget = Home.getMouseTarget(e);
    if (
      mytarget != Home.actionTarget &&
      Home.actionTarget &&
      Home.actionTarget.childElementCount > 2
    ) {
      Home.actionTarget.childNodes[
        Home.actionTarget.childElementCount - 1
      ].style.visibility = "hidden";
    }
    Home.actionTarget = mytarget;
    Home.initialPt = Events.getTargetPoint(e);
    if (Home.actionTarget) {
      holdit(Home.actionTarget);
    }
    function holdit() {
      frame.ontouchmove = Home.handleMove;
      frame.onpointermove = Home.handleMove;
      var repeat = function () {
        if (Home.actionTarget && Home.actionTarget.childElementCount > 2) {
          Home.actionTarget.childNodes[
            Home.actionTarget.childElementCount - 1
          ].style.visibility = "visible";

          Home.holding = true;
        }
      };
      timeoutEvent = setTimeout(repeat, 500);
    }
    Home.scrolltop = document.body.scrollTop;
  }

  static handleMove(e) {
    var pt = Events.getTargetPoint(e);
    var delta = Vector.diff(pt, Home.initialPt);
    if (!Home.dragging && Vector.len(delta) > 20) {
      Home.dragging = true;
    }
    if (!Home.dragging) {
      return;
    }
    if (timeoutEvent) {
      clearTimeout(timeoutEvent);
    }
    timeoutEvent = undefined;
  }

  static getMouseTarget(e) {
    var t = e.target;
    if (t == frame) {
      return null;
    }
    if (t.parentNode && !t.parentNode.tagName) {
      return null;
    }
    while (
      t.parentNode &&
      t.parentNode != frame &&
      t.parentNode.getAttribute("class") != "scrollarea"
    ) {
      t = t.parentNode;
    }
    return !t.parentNode || t.parentNode == frame ? null : t;
  }

  static handleTouchEnd(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.touches && e.touches.length > 1) {
      return;
    }
    frame.ontouchmove = undefined;
    frame.onpointermove = undefined;
    if (timeoutEvent) {
      clearTimeout(timeoutEvent);
    }
    timeoutEvent = undefined;
    if (Home.dragging) {
      return;
    }
    Home.performAction(e);
  }

  static performAction(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!Home.actionTarget) {
      return;
    }
    if (Home.holding) {
      return;
    }
    Home.performActionForTarget(Home.actionTarget, Home.getAction(e));
  }

  static performActionForTarget(target, action) {
    if (!target) {
      return;
    }
    Home.actionTarget = target;
    var md5 = target.id;
    switch (action) {
      case "project":
        ScratchAudio.sndFX("keydown.wav");
        if (md5 && md5 == "newproject") {
          Home.createNewProject();
        } else if (md5) {
          OS.setfile("homescroll.sjr", gn("wrapc").scrollTop, function () {
            doNext(md5);
          });
        }
        break;
      case "delete":
        ScratchAudio.sndFX("cut.wav");
        Project.thumbnailUnique(
          target.thumb,
          target.id,
          function (isUnique) {
            if (isUnique) {
              OS.remove(target.thumb, OS.trace);
            }
          }
        );
        OS.setfield(
          OS.database,
          target.id,
          "deleted",
          "YES",
          Home.removeProjThumb
        );
        break;
      default:
        if (target && target.childElementCount > 2) {
          target.childNodes[
            target.childElementCount - 1
          ].style.visibility = "hidden";
        }
        break;
    }
    function doNext() {
      OS.analyticsEvent("lobby", "existing_project_edited");
      goToLink("editor.html?pmd5=" + md5 + "&mode=edit");
    }
  }

  static createNewProject() {
    OS.analyticsEvent("lobby", "project_created");
    var obj = {};
    // XXX: for localization, the new project name should likely be refactored
    obj.name = Home.getNextName(Localization.localize("NEW_PROJECT_PREFIX"));
    obj.version = version;
    obj.mtime = new Date().getTime().toString();
    IO.createProject(obj, Home.gotoEditor);
  }

  static gotoEditor(md5) {
    OS.setfile("homescroll.sjr", gn("wrapc").scrollTop, function () {
      doNext(md5);
    });
    function doNext(md5) {
      goToLink("editor.html?pmd5=" + md5 + "&mode=edit");
    }
  }

  // Project names are given by reading the DOM elements of existing projects...
  static getNextName(name) {
    var pn = [];
    var div = gn("scrollarea");
    for (var i = 0; i < div.childElementCount; i++) {
      if (div.childNodes[i].id == "newproject") {
        continue;
      }
      pn.push(div.childNodes[i].childNodes[1].childNodes[0].textContent);
    }
    var n = 1;
    while (pn.indexOf(name + " " + n) > -1) {
      n++;
    }
    return name + " " + n;
  }

  static removeProjThumb() {
    if (Home.actionTarget && Home.actionTarget.parentNode) {
      Home.actionTarget.parentNode.removeChild(Home.actionTarget);
    }
    Home.actionTarget = undefined;
  }

  static getAction(e) {
    if (!Home.actionTarget) {
      return "none";
    }
    var shown =
      Home.actionTarget.childElementCount > 2
        ? Home.actionTarget.childNodes[Home.actionTarget.childElementCount - 1]
          .style.visibility == "visible"
        : false;
    if (e && shown) {
      var t;
      if (window.event) {
        t = window.event.srcElement;
      } else {
        t = e.target;
      }
      if (t.getAttribute("class") == "closex") {
        return "delete";
      }
    }
    return "project";
  }

  //////////////////////////
  // Gather projects
  //////////////////////////

  static displayYourProjects() {
    OS.getfile("homescroll.sjr", gotScrollsState);
    function gotScrollsState(str) {
      let num = Number(atob(str));
      scrollvalue = num.toString() == "NaN" ? 0 : num;
      var json = {};
      json.cond = "deleted = ? AND version = ? AND gallery IS NULL";
      json.items = ["name", "thumbnail", "id", "isgift"];
      json.values = ["NO", version];
      json.order = "ctime desc";
      IO.query(OS.database, json, Home.displayProjects);
    }
  }

  static displayProjects(str) {
    console.log("displayProjects", str);
    setTimeout(function () {
      let data = JSON.parse(str);
      var div = gn("scrollarea");
      while (div.childElementCount > 0) {
        div.removeChild(div.childNodes[0]);
      }
      Home.emptyProjectThumbnail(div);
      for (var i = 0; i < data.length; i++) {
        Home.addProjectLink(div, data[i]);
      }
      setTimeout(function () {
        Lobby.busy = false;
      }, 1000);
      if (gn("wrapc")) {
        gn("wrapc").scrollTop = scrollvalue;
      }
    }, 3);
  }

  static addProjectLink(parent, aa) {
    var data = IO.parseProjectData(aa);
    var id = data.id;
    var th = data.thumbnail;
    if (!th) {
      return;
    }
    var thumb = typeof th === "string" ? JSON.parse(th) : th;
    var pc = thumb.pagecount ? thumb.pagecount : 1;
    var tb = newHTML("div", "projectthumb", parent);
    tb.setAttribute("id", id);
    tb.type = "projectthumb";
    tb.thumb = thumb.md5;
    var mt = newHTML("div", "aproject p" + pc, tb);
    Home.insertThumbnail(mt, 192, 144, thumb);
    var label = newHTML("div", "projecttitle", tb);
    var txt = newHTML("h4", undefined, label);
    txt.textContent = data.name;

    var bow = newHTML("div", "share", tb);
    var ribbonHorizontal = newHTML("div", "ribbonHorizontal", tb);
    var ribbonVertical = newHTML("div", "ribbonVertical", tb);

    if (data.isgift != "0") {
      // If it's a gift, show the bow and ribbon
      bow.style.visibility = "visible";
      ribbonHorizontal.style.visibility = "visible";
      ribbonVertical.style.visibility = "visible";
    }

    newHTML("div", "closex", tb);
    Home.addCardActionButton(
      tb,
      "card-action-open",
      Localization.localize("A11Y_OPEN") + " " + data.name,
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        Home.performActionForTarget(tb, "project");
      }
    );
    Home.addCardActionButton(
      tb,
      "card-action-delete",
      Localization.localize("A11Y_DELETE") + " " + data.name,
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        Home.performActionForTarget(tb, "delete");
      }
    );
  }

  static insertThumbnail(p, w, h, data) {
    var md5 = data.md5;
    var img = newHTML("img", undefined, p);
    img.alt = "";
    if (md5) {
      IO.getAsset(md5, drawMe);
    }
    img.ondragstart = function () {
      return false;
    };
    function drawMe(url) {
      img.src = url;
    }
  }

  static addCardActionButton(parent, className, label, handler) {
    var button = newButton("sr-only-focusable lobby-card-action " + className, parent, {
      ariaLabel: label
    });
    button.textContent = label;
    button.onclick = handler;
    return button;
  }
}

class Events {
  static getTargetPoint(e) {
    if (isTablet) {
      if (e.touches && e.touches.length > 0) {
        return {
          x: e.touches[0].pageX,
          y: e.touches[0].pageY,
        };
      } else if (e.changedTouches) {
        return {
          x: e.changedTouches[0].pageX,
          y: e.changedTouches[0].pageY,
        };
      }
    }
    return {
      x: e.clientX,
      y: e.clientY,
    };
  }
}
