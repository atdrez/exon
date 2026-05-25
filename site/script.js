(function () {
    "use strict";

    // -------- Exon syntax highlighting for highlight.js --------

    function registerExonLanguage(hljs) {
        var BLOCK_COMMENT = {
            scope: "comment",
            begin: /\*{3}/,
            end: /\*{3}/,
            relevance: 10
        };

        var LINE_COMMENT = hljs.COMMENT("//", "$");

        var TRIPLE_STRING = {
            scope: "string",
            begin: /"""/,
            end: /"""/,
            contains: [{ begin: /\\./ }]
        };

        var BINDING = {
            scope: "variable",
            match: /@[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/
        };

        var COMPONENT_NS = {
            scope: "built_in",
            match: /\bfn\.[a-zA-Z_][a-zA-Z0-9_.]*(?=\s*\{)/
        };

        var USING = {
            scope: "meta",
            match: /^using\s+[^\n]+/
        };

        var PROPERTY_KEY = {
            scope: "attr",
            match: /\b[a-zA-Z_][a-zA-Z0-9_]*\s*(?=:)/
        };

        return {
            name: "Exon",
            keywords: {
                keyword: "using null true false",
                literal: "null true false"
            },
            contains: [
                BLOCK_COMMENT,
                LINE_COMMENT,
                TRIPLE_STRING,
                hljs.QUOTE_STRING_MODE,
                hljs.C_NUMBER_MODE,
                BINDING,
                COMPONENT_NS,
                USING,
                PROPERTY_KEY
            ]
        };
    }

    if (typeof hljs !== "undefined") {
        hljs.registerLanguage("exon", registerExonLanguage);
        hljs.highlightAll();
    }

    // -------- Build sidebar subitems from h2 elements --------

    var sections = Array.prototype.slice.call(
        document.querySelectorAll(".doc-section")
    );

    sections.forEach(function (section) {
        var sectionId = section.id;
        var parentAnchor = document.querySelector(
            '.sidebar-nav a[href="#' + sectionId + '"]'
        );
        if (!parentAnchor) { return; }

        var h2s = Array.prototype.slice.call(section.querySelectorAll("h2"));
        if (h2s.length === 0) { return; }

        var subList = document.createElement("ul");
        subList.className = "sub-list";

        h2s.forEach(function (h2) {
            if (!h2.id) {
                h2.id = sectionId + "-" +
                    h2.textContent.trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, "");
            }

            var li = document.createElement("li");
            var a = document.createElement("a");
            a.href = "#" + h2.id;
            a.textContent = h2.textContent.trim();
            li.appendChild(a);
            subList.appendChild(li);
        });

        parentAnchor.closest("li").appendChild(subList);
    });

    // -------- Build navigable target list --------
    // Sections first, then all h2s in document order.
    // We rebuild this after appending sublists so IDs are guaranteed to exist.

    var navTargets = [];
    sections.forEach(function (section) {
        navTargets.push(section);
        Array.prototype.slice.call(
            section.querySelectorAll("h2[id]")
        ).forEach(function (h2) {
            navTargets.push(h2);
        });
    });

    // Sort by vertical position so binary-search-style scan works correctly.
    navTargets.sort(function (a, b) {
        return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
    });

    // All nav links (now includes dynamically added sub-list links).
    var navLinks = Array.prototype.slice.call(
        document.querySelectorAll(".sidebar-nav a")
    );

    // -------- Active section tracking (scroll-based) --------

    var lastActiveId = null;

    function updateActive() {
        var scrollY = window.scrollY + 110;
        var activeEl = navTargets[0] || null;

        for (var i = 0; i < navTargets.length; i++) {
            var top = navTargets[i].getBoundingClientRect().top + window.scrollY;
            if (top <= scrollY) {
                activeEl = navTargets[i];
            } else {
                break;
            }
        }

        if (!activeEl) { return; }
        if (activeEl.id === lastActiveId) { return; }
        lastActiveId = activeEl.id;

        var activeId = activeEl.id;
        var isH2 = activeEl.tagName === "H2";
        var parentId = isH2
            ? (activeEl.closest(".doc-section") || {}).id
            : null;

        navLinks.forEach(function (link) {
            var href = link.getAttribute("href");
            var linkId = href ? href.slice(1) : "";
            link.classList.remove("active", "has-active");
            if (linkId === activeId) {
                link.classList.add("active");
            } else if (parentId && linkId === parentId) {
                link.classList.add("has-active");
            }
        });

        // Scroll the active link into view within the sidebar if needed.
        var activeLink = document.querySelector(
            '.sidebar-nav a[href="#' + activeId + '"]'
        );
        if (activeLink) {
            var sidebar = document.querySelector(".sidebar");
            if (sidebar) {
                var linkTop = activeLink.getBoundingClientRect().top;
                var sidebarRect = sidebar.getBoundingClientRect();
                if (linkTop < sidebarRect.top + 40 || linkTop > sidebarRect.bottom - 40) {
                    activeLink.scrollIntoView({ block: "nearest" });
                }
            }
        }
    }

    window.addEventListener("scroll", updateActive, { passive: true });
    updateActive();

    // -------- Smooth scroll on link click --------

    document.addEventListener("click", function (e) {
        var link = e.target.closest("a");
        if (!link) { return; }
        var href = link.getAttribute("href");
        if (href && href.charAt(0) === "#") {
            var target = document.getElementById(href.slice(1));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: "smooth" });
                history.pushState(null, "", href);
            }
        }
    });

    // -------- Sidebar search --------

    var searchInput = document.getElementById("sidebar-search");
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            var q = searchInput.value.trim().toLowerCase();

            // Re-query to include dynamically added sub-list links.
            var allLinks = Array.prototype.slice.call(
                document.querySelectorAll(".sidebar-nav a")
            );

            allLinks.forEach(function (link) {
                var text = link.textContent.toLowerCase();
                var li = link.closest("li");
                if (li) {
                    li.style.display = (!q || text.indexOf(q) !== -1) ? "" : "none";
                }
            });

            // Keep section labels visible if any sibling li is visible.
            Array.prototype.slice.call(
                document.querySelectorAll(".sidebar-section-label")
            ).forEach(function (label) {
                if (!q) {
                    label.style.display = "";
                    return;
                }
                var sibling = label.nextElementSibling;
                var hasVisible = false;
                while (sibling && !sibling.classList.contains("sidebar-section-label")) {
                    if (sibling.style.display !== "none") {
                        hasVisible = true;
                        break;
                    }
                    sibling = sibling.nextElementSibling;
                }
                label.style.display = hasVisible ? "" : "none";
            });
        });
    }
}());
