export var Utils;
(function (Utils) {
    function copyStringToClipboard(content) {
        var el = document.createElement("textarea");
        el.value = content;
        el.setAttribute("readonly", "");
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
    }
    Utils.copyStringToClipboard = copyStringToClipboard;
    function removeMd(md, options = {
        listUnicodeChar: "",
        stripListLeaders: true,
        gfm: true,
        useImgAltText: true,
    }) {
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
                    output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, options.listUnicodeChar + " $1");
                else
                    output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, "$1");
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
                .replace(/\!\[(.*?)\][\[\(].*?[\]\)]/g, options.useImgAltText ? "$1" : "")
                // Remove inline links
                .replace(/\[(.*?)\][\[\(].*?[\]\)]/g, "$1")
                // Remove blockquotes
                .replace(/^\s{0,3}>\s?/g, "")
                // Remove reference-style links?
                .replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, "")
                // Remove atx-style headers
                .replace(/^(\n)?\s{0,}#{1,6}\s+| {0,}(\n)?\s{0,}#{0,} {0,}(\n)?\s{0,}$/gm, "$1$2$3")
                // Remove emphasis (repeat the line to remove double emphasis)
                .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, "$2")
                .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, "$2")
                // Remove code blocks
                .replace(/(`{3,})(.*?)\1/gm, "$2")
                // Remove inline code
                .replace(/`(.+?)`/g, "$1")
                // Replace two or more newlines with exactly two? Not entirely sure this belongs here...
                .replace(/\n{2,}/g, "\n\n");
        }
        catch (e) {
            console.error(e);
            return md;
        }
        return output;
    }
    Utils.removeMd = removeMd;
})(Utils || (Utils = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxNQUFNLEtBQVEsS0FBSyxDQThGbEI7QUE5RkQsV0FBYyxLQUFLO0lBQ2pCLFNBQWdCLHFCQUFxQixDQUFDLE9BQWU7UUFDbkQsSUFBSSxFQUFFLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM1QyxFQUFFLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQztRQUNuQixFQUFFLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNoQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM5QixFQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDWixRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzdCLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFSZSwyQkFBcUIsd0JBUXBDLENBQUE7SUFTRCxTQUFnQixRQUFRLENBQ3RCLEVBQVUsRUFDVixVQUEyQjtRQUN6QixlQUFlLEVBQUUsRUFBRTtRQUNuQixnQkFBZ0IsRUFBRSxJQUFJO1FBQ3RCLEdBQUcsRUFBRSxJQUFJO1FBQ1QsYUFBYSxFQUFFLElBQUk7S0FDcEI7UUFFRCxJQUFJLE1BQU0sR0FBRyxFQUFFO2FBQ1osT0FBTyxDQUFDLG9CQUFvQixFQUFFLEVBQUUsQ0FBQzthQUNqQyxPQUFPLENBQUMsbUNBQW1DLEVBQUUsSUFBSSxDQUFDO2FBQ2xELE9BQU8sQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDO2FBQzlCLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUM7YUFDaEMsT0FBTyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUM7YUFDNUIsT0FBTyxDQUFDLGlDQUFpQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWxELElBQUk7WUFDRixJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRTtnQkFDNUIsSUFBSSxPQUFPLENBQUMsZUFBZTtvQkFDekIsTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQ3JCLGlDQUFpQyxFQUNqQyxPQUFPLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FDaEMsQ0FBQzs7b0JBQ0MsTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsaUNBQWlDLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDdkU7WUFDRCxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUU7Z0JBQ2YsTUFBTSxHQUFHLE1BQU07b0JBQ2IsU0FBUztxQkFDUixPQUFPLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQztvQkFDMUIsb0JBQW9CO3FCQUNuQixPQUFPLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztvQkFDekIsZ0JBQWdCO3FCQUNmLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDO29CQUNuQixvQkFBb0I7cUJBQ25CLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDN0I7WUFDRCxNQUFNLEdBQUcsTUFBTTtnQkFDYixtQkFBbUI7aUJBQ2xCLE9BQU8sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO2dCQUN4Qiw4QkFBOEI7aUJBQzdCLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUM7Z0JBQy9CLG9CQUFvQjtpQkFDbkIsT0FBTyxDQUFDLHNCQUFzQixFQUFFLEVBQUUsQ0FBQztpQkFDbkMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLEVBQUUsQ0FBQztnQkFDckMsZ0JBQWdCO2lCQUNmLE9BQU8sQ0FDTiw2QkFBNkIsRUFDN0IsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQ2xDO2dCQUNELHNCQUFzQjtpQkFDckIsT0FBTyxDQUFDLDJCQUEyQixFQUFFLElBQUksQ0FBQztnQkFDM0MscUJBQXFCO2lCQUNwQixPQUFPLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztnQkFDN0IsZ0NBQWdDO2lCQUMvQixPQUFPLENBQUMsd0NBQXdDLEVBQUUsRUFBRSxDQUFDO2dCQUN0RCwyQkFBMkI7aUJBQzFCLE9BQU8sQ0FDTixnRUFBZ0UsRUFDaEUsUUFBUSxDQUNUO2dCQUNELDhEQUE4RDtpQkFDN0QsT0FBTyxDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQztpQkFDOUMsT0FBTyxDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQztnQkFDL0MscUJBQXFCO2lCQUNwQixPQUFPLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDO2dCQUNsQyxxQkFBcUI7aUJBQ3BCLE9BQU8sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDO2dCQUMxQix3RkFBd0Y7aUJBQ3ZGLE9BQU8sQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7U0FDL0I7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakIsT0FBTyxFQUFFLENBQUM7U0FDWDtRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUEzRWUsY0FBUSxXQTJFdkIsQ0FBQTtBQUNILENBQUMsRUE5RmEsS0FBSyxLQUFMLEtBQUssUUE4RmxCIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IG1vZHVsZSBVdGlscyB7XG4gIGV4cG9ydCBmdW5jdGlvbiBjb3B5U3RyaW5nVG9DbGlwYm9hcmQoY29udGVudDogc3RyaW5nKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRleHRhcmVhXCIpO1xuICAgIGVsLnZhbHVlID0gY29udGVudDtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJyZWFkb25seVwiLCBcIlwiKTtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGVsKTtcbiAgICBlbC5zZWxlY3QoKTtcbiAgICBkb2N1bWVudC5leGVjQ29tbWFuZChcImNvcHlcIik7XG4gICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChlbCk7XG4gIH1cblxuICBpbnRlcmZhY2UgUmVtb3ZlTWRPcHRpb25zIHtcbiAgICBsaXN0VW5pY29kZUNoYXI/OiBzdHJpbmc7XG4gICAgc3RyaXBMaXN0TGVhZGVycz86IGJvb2xlYW47XG4gICAgZ2ZtPzogYm9vbGVhbjtcbiAgICB1c2VJbWdBbHRUZXh0PzogYm9vbGVhbjtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiByZW1vdmVNZChcbiAgICBtZDogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFJlbW92ZU1kT3B0aW9ucyA9IHtcbiAgICAgIGxpc3RVbmljb2RlQ2hhcjogXCJcIixcbiAgICAgIHN0cmlwTGlzdExlYWRlcnM6IHRydWUsXG4gICAgICBnZm06IHRydWUsXG4gICAgICB1c2VJbWdBbHRUZXh0OiB0cnVlLFxuICAgIH1cbiAgKSB7XG4gICAgbGV0IG91dHB1dCA9IG1kXG4gICAgICAucmVwbGFjZSgvXi0tLVtcXHNcXFNdKi0tLVxcbiovZywgXCJcIilcbiAgICAgIC5yZXBsYWNlKC9cXFtcXFtbXlxcfFxcW1xcXV0qXFx8KFteXFx8XFxbXFxdXSopXFxdXFxdL2csIFwiJDFcIilcbiAgICAgIC5yZXBsYWNlKC9cXFtcXFsoLiopXFxdXFxdL2csIFwiJDFcIilcbiAgICAgIC5yZXBsYWNlKC9gYGAoW15gXSkqYGBgXFxuKi9nLCBcIlwiKVxuICAgICAgLnJlcGxhY2UoL1xcJChbXiRdKSpcXCQqL2csIFwiXCIpXG4gICAgICAucmVwbGFjZSgvXigtXFxzKj98XFwqXFxzKj98X1xccyo/KXszLH1cXHMqJC9nbSwgXCJcIik7XG5cbiAgICB0cnkge1xuICAgICAgaWYgKG9wdGlvbnMuc3RyaXBMaXN0TGVhZGVycykge1xuICAgICAgICBpZiAob3B0aW9ucy5saXN0VW5pY29kZUNoYXIpXG4gICAgICAgICAgb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoXG4gICAgICAgICAgICAvXihbXFxzXFx0XSopKFtcXCpcXC1cXCtdfFxcZCtcXC4pXFxzKy9nbSxcbiAgICAgICAgICAgIG9wdGlvbnMubGlzdFVuaWNvZGVDaGFyICsgXCIgJDFcIlxuICAgICAgICAgICk7XG4gICAgICAgIGVsc2Ugb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoL14oW1xcc1xcdF0qKShbXFwqXFwtXFwrXXxcXGQrXFwuKVxccysvZ20sIFwiJDFcIik7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5nZm0pIHtcbiAgICAgICAgb3V0cHV0ID0gb3V0cHV0XG4gICAgICAgICAgLy8gSGVhZGVyXG4gICAgICAgICAgLnJlcGxhY2UoL1xcbj17Mix9L2csIFwiXFxuXCIpXG4gICAgICAgICAgLy8gRmVuY2VkIGNvZGVibG9ja3NcbiAgICAgICAgICAucmVwbGFjZSgvfnszfS4qXFxuL2csIFwiXCIpXG4gICAgICAgICAgLy8gU3RyaWtldGhyb3VnaFxuICAgICAgICAgIC5yZXBsYWNlKC9+fi9nLCBcIlwiKVxuICAgICAgICAgIC8vIEZlbmNlZCBjb2RlYmxvY2tzXG4gICAgICAgICAgLnJlcGxhY2UoL2B7M30uKlxcbi9nLCBcIlwiKTtcbiAgICAgIH1cbiAgICAgIG91dHB1dCA9IG91dHB1dFxuICAgICAgICAvLyBSZW1vdmUgSFRNTCB0YWdzXG4gICAgICAgIC5yZXBsYWNlKC88W14+XSo+L2csIFwiXCIpXG4gICAgICAgIC8vIFJlbW92ZSBzZXRleHQtc3R5bGUgaGVhZGVyc1xuICAgICAgICAucmVwbGFjZSgvXls9XFwtXXsyLH1cXHMqJC9nLCBcIlwiKVxuICAgICAgICAvLyBSZW1vdmUgZm9vdG5vdGVzP1xuICAgICAgICAucmVwbGFjZSgvXFxbXFxeLis/XFxdKFxcOiAuKj8kKT8vZywgXCJcIilcbiAgICAgICAgLnJlcGxhY2UoL1xcc3swLDJ9XFxbLio/XFxdOiAuKj8kL2csIFwiXCIpXG4gICAgICAgIC8vIFJlbW92ZSBpbWFnZXNcbiAgICAgICAgLnJlcGxhY2UoXG4gICAgICAgICAgL1xcIVxcWyguKj8pXFxdW1xcW1xcKF0uKj9bXFxdXFwpXS9nLFxuICAgICAgICAgIG9wdGlvbnMudXNlSW1nQWx0VGV4dCA/IFwiJDFcIiA6IFwiXCJcbiAgICAgICAgKVxuICAgICAgICAvLyBSZW1vdmUgaW5saW5lIGxpbmtzXG4gICAgICAgIC5yZXBsYWNlKC9cXFsoLio/KVxcXVtcXFtcXChdLio/W1xcXVxcKV0vZywgXCIkMVwiKVxuICAgICAgICAvLyBSZW1vdmUgYmxvY2txdW90ZXNcbiAgICAgICAgLnJlcGxhY2UoL15cXHN7MCwzfT5cXHM/L2csIFwiXCIpXG4gICAgICAgIC8vIFJlbW92ZSByZWZlcmVuY2Utc3R5bGUgbGlua3M/XG4gICAgICAgIC5yZXBsYWNlKC9eXFxzezEsMn1cXFsoLio/KVxcXTogKFxcUyspKCBcIi4qP1wiKT9cXHMqJC9nLCBcIlwiKVxuICAgICAgICAvLyBSZW1vdmUgYXR4LXN0eWxlIGhlYWRlcnNcbiAgICAgICAgLnJlcGxhY2UoXG4gICAgICAgICAgL14oXFxuKT9cXHN7MCx9I3sxLDZ9XFxzK3wgezAsfShcXG4pP1xcc3swLH0jezAsfSB7MCx9KFxcbik/XFxzezAsfSQvZ20sXG4gICAgICAgICAgXCIkMSQyJDNcIlxuICAgICAgICApXG4gICAgICAgIC8vIFJlbW92ZSBlbXBoYXNpcyAocmVwZWF0IHRoZSBsaW5lIHRvIHJlbW92ZSBkb3VibGUgZW1waGFzaXMpXG4gICAgICAgIC5yZXBsYWNlKC8oW1xcKl9dezEsM30pKFxcUy4qP1xcU3swLDF9KVxcMS9nLCBcIiQyXCIpXG4gICAgICAgIC5yZXBsYWNlKC8oW1xcKl9dezEsM30pKFxcUy4qP1xcU3swLDF9KVxcMS9nLCBcIiQyXCIpXG4gICAgICAgIC8vIFJlbW92ZSBjb2RlIGJsb2Nrc1xuICAgICAgICAucmVwbGFjZSgvKGB7Myx9KSguKj8pXFwxL2dtLCBcIiQyXCIpXG4gICAgICAgIC8vIFJlbW92ZSBpbmxpbmUgY29kZVxuICAgICAgICAucmVwbGFjZSgvYCguKz8pYC9nLCBcIiQxXCIpXG4gICAgICAgIC8vIFJlcGxhY2UgdHdvIG9yIG1vcmUgbmV3bGluZXMgd2l0aCBleGFjdGx5IHR3bz8gTm90IGVudGlyZWx5IHN1cmUgdGhpcyBiZWxvbmdzIGhlcmUuLi5cbiAgICAgICAgLnJlcGxhY2UoL1xcbnsyLH0vZywgXCJcXG5cXG5cIik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgIHJldHVybiBtZDtcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfVxufVxuIl19