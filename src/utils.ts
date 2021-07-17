export module Utils {
  export function copyStringToClipboard(content: string) {
    var el = document.createElement("textarea");
    el.value = content;
    el.setAttribute("readonly", "");
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }

  export function getOS() {
    if (window.navigator.userAgent.indexOf("Windows NT 10.0") != -1)
      return "windows";
    if (window.navigator.userAgent.indexOf("Mac") != -1) return "macos";
    if (window.navigator.userAgent.indexOf("Linux") != -1) return "linux";
  }

  interface RemoveMdOptions {
    listUnicodeChar?: string;
    stripListLeaders?: boolean;
    gfm?: boolean;
    useImgAltText?: boolean;
  }

  export function removeMd(
    md: string,
    options: RemoveMdOptions = {
      listUnicodeChar: "",
      stripListLeaders: true,
      gfm: true,
      useImgAltText: true,
    }
  ) {
    let output = md
      .replace(/^---[\s\S]*---\n*/g, "")
      .replace(/\[\[[^\|\[\]]*\|([^\|\[\]]*)\]\]/g, "$1")
      .replace(/\[\[(.*)\]\]/g, "$1")
      .replace(/```([^`])*```\n*/g, "")
      .replace(/\$([^$])*\$*/g, "")
      .replace(/^(-\s*?|\*\s*?|_\s*?){3,}\s*$/gm, "");

    try {
      if (options.stripListLeaders) {
        if (options.listUnicodeChar)
          output = output.replace(
            /^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm,
            options.listUnicodeChar + " $1"
          );
        else output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, "$1");
      }
      if (options.gfm) {
        output = output
          // Header
          .replace(/\n={2,}/g, "\n")
          // Fenced codeblocks
          .replace(/~{3}.*\n/g, "")
          // Strikethrough
          .replace(/~~/g, "")
          // Fenced codeblocks
          .replace(/`{3}.*\n/g, "");
      }
      output = output
        // Remove HTML tags
        .replace(/<[^>]*>/g, "")
        // Remove setext-style headers
        .replace(/^[=\-]{2,}\s*$/g, "")
        // Remove footnotes?
        .replace(/\[\^.+?\](\: .*?$)?/g, "")
        .replace(/\s{0,2}\[.*?\]: .*?$/g, "")
        // Remove images
        .replace(
          /\!\[(.*?)\][\[\(].*?[\]\)]/g,
          options.useImgAltText ? "$1" : ""
        )
        // Remove inline links
        .replace(/\[(.*?)\][\[\(].*?[\]\)]/g, "$1")
        // Remove blockquotes
        .replace(/^\s{0,3}>\s?/g, "")
        // Remove reference-style links?
        .replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, "")
        // Remove atx-style headers
        .replace(
          /^(\n)?\s{0,}#{1,6}\s+| {0,}(\n)?\s{0,}#{0,} {0,}(\n)?\s{0,}$/gm,
          "$1$2$3"
        )
        // Remove emphasis (repeat the line to remove double emphasis)
        .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, "$2")
        .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, "$2")
        // Remove code blocks
        .replace(/(`{3,})(.*?)\1/gm, "$2")
        // Remove inline code
        .replace(/`(.+?)`/g, "$1")
        // Replace two or more newlines with exactly two? Not entirely sure this belongs here...
        .replace(/\n{2,}/g, "\n\n");
    } catch (e) {
      console.error(e);
      return md;
    }
    return output;
  }

  export function wait(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  export function fetchRetry(url, delay, tries, fetchOptions = {}) {
    function onError(err) {
      var triesLeft = tries - 1;
      if (!triesLeft) {
        throw err;
      }
      return wait(delay).then(() =>
        fetchRetry(url, delay, triesLeft, fetchOptions)
      );
    }
    return fetch(url, fetchOptions).catch(onError);
  }
}
