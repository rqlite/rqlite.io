/*
 * Copy-to-clipboard for code blocks.
 *
 * Docsy 0.5.1 ships assets/js/click-to-copy.js but it is unreachable — the
 * theme's scripts.html guards it with `{{ else if false }}` — and it depends on
 * Popper for a tooltip. This is a dependency-free replacement.
 *
 * Hugo only wraps fenced blocks that declare a language in <div class="highlight">;
 * blocks without a language render as a bare <pre>. Both get a button.
 */
(function () {
  "use strict";

  var LABEL_IDLE = "Copy to clipboard";
  var LABEL_DONE = "Copied to clipboard";
  var LABEL_FAIL = "Copy failed";

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy") ? resolve() : reject(new Error("execCommand failed"));
      } catch (e) {
        reject(e);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  function copyText(text) {
    // The async clipboard API is unavailable over plain http, and can still
    // reject when it is available — a denied permission, or a document that
    // isn't focused. Fall back on rejection, not just on absence.
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        return legacyCopy(text);
      });
    }
    return legacyCopy(text);
  }

  /*
   * Strip the shell prompt so pasted commands actually run — but only when
   * every non-empty line has one. Mixed blocks (a shell transcript with both
   * commands and output) are copied verbatim.
   */
  function stripPrompts(text) {
    var lines = text.replace(/\s+$/, "").split("\n");
    var nonEmpty = lines.filter(function (l) {
      return l.trim() !== "";
    });
    if (!nonEmpty.length) return text.trim();
    var allPrompted = nonEmpty.every(function (l) {
      return /^\s*\$ /.test(l);
    });
    if (!allPrompted) return lines.join("\n");
    return lines
      .map(function (l) {
        return l.replace(/^\s*\$ /, "");
      })
      .join("\n");
  }

  /*
   * Swap the icon glyph rather than writing text into the button: these are
   * icon-only controls, so replacing the contents would resize them and lose the
   * icon on restore. The accessible name lives on aria-label, and `title` gives
   * sighted users a hover hint that an unlabelled icon otherwise lacks.
   */
  function setIconState(button, icon, state) {
    var glyph = "fa-copy";
    var label = LABEL_IDLE;
    if (state === "done") {
      glyph = "fa-check";
      label = LABEL_DONE;
    } else if (state === "failed") {
      glyph = "fa-xmark";
      label = LABEL_FAIL;
    }
    if (icon) icon.className = "fas " + glyph;
    button.classList.toggle("is-copied", state === "done");
    button.classList.toggle("is-failed", state === "failed");
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  }

  function flash(button, icon, ok) {
    setIconState(button, icon, ok ? "done" : "failed");
    window.clearTimeout(button.rqTimer);
    button.rqTimer = window.setTimeout(function () {
      setIconState(button, icon, "idle");
    }, 1600);
  }

  function addButton(container, source) {
    if (container.querySelector(":scope > .rq-copy")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "rq-copy";

    var icon = document.createElement("i");
    icon.setAttribute("aria-hidden", "true");
    button.appendChild(icon);
    setIconState(button, icon, "idle");

    button.addEventListener("click", function () {
      copyText(stripPrompts(source.textContent)).then(
        function () {
          flash(button, icon, true);
        },
        function () {
          flash(button, icon, false);
        }
      );
    });
    container.appendChild(button);
  }

  function init() {
    var content = document.querySelector(".td-content");
    if (content) {
      content.querySelectorAll("pre").forEach(function (pre) {
        // Mermaid and similar render into <pre>; they hold no copyable source.
        if (pre.classList.contains("mermaid")) return;

        var wrapper = pre.parentElement;
        if (!wrapper || !wrapper.classList.contains("highlight")) {
          wrapper = document.createElement("div");
          wrapper.className = "rq-code";
          pre.parentNode.insertBefore(wrapper, pre);
          wrapper.appendChild(pre);
        }
        addButton(wrapper, pre);
      });
    }

    // The install one-liner in the home page hero has its own inline button.
    document.querySelectorAll(".rq-install").forEach(function (box) {
      var button = box.querySelector(".rq-install__copy");
      var code = box.querySelector(".rq-install__cmd");
      if (!button || !code) return;
      var icon = button.querySelector("i");
      setIconState(button, icon, "idle");

      button.addEventListener("click", function () {
        // Both arguments: a rejection here would otherwise surface as an
        // unhandled promise rejection and leave the button showing nothing.
        copyText(code.textContent.trim()).then(
          function () {
            flash(button, icon, true);
          },
          function () {
            flash(button, icon, false);
          }
        );
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
