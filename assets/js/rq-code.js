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

  var COPY = "Copy";
  var DONE = "Copied";

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

  function flash(button) {
    button.textContent = DONE;
    button.classList.add("is-copied");
    button.setAttribute("aria-label", "Copied to clipboard");
    window.setTimeout(function () {
      button.textContent = COPY;
      button.classList.remove("is-copied");
      button.setAttribute("aria-label", "Copy code to clipboard");
    }, 1600);
  }

  function addButton(container, source) {
    if (container.querySelector(":scope > .rq-copy")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "rq-copy";
    button.textContent = COPY;
    button.setAttribute("aria-label", "Copy code to clipboard");
    button.addEventListener("click", function () {
      copyText(stripPrompts(source.textContent)).then(
        function () {
          flash(button);
        },
        function () {
          button.textContent = "Failed";
          window.setTimeout(function () {
            button.textContent = COPY;
          }, 1600);
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

      // Swap the icon rather than replacing the button's contents: writing text
      // into an icon-only button resizes it and loses the icon on restore.
      var setState = function (ok) {
        if (icon) icon.className = ok ? "fas fa-check" : "fas fa-xmark";
        button.classList.toggle("is-copied", ok);
        button.setAttribute("aria-label", ok ? "Copied to clipboard" : "Copy failed");
        window.clearTimeout(button.rqTimer);
        button.rqTimer = window.setTimeout(function () {
          if (icon) icon.className = "fas fa-copy";
          button.classList.remove("is-copied");
          button.setAttribute("aria-label", "Copy install command to clipboard");
        }, 1600);
      };

      button.addEventListener("click", function () {
        // Both arguments: a rejection here would otherwise surface as an
        // unhandled promise rejection and leave the button showing nothing.
        copyText(code.textContent.trim()).then(
          function () {
            setState(true);
          },
          function () {
            setState(false);
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
