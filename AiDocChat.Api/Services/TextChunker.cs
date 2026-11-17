using System.Text;
using System.Text.RegularExpressions;

namespace AiDocChat.Api.Services;

public sealed record Chunk(int? Page, string Text);

/// <summary>
/// Splits text into overlapping chunks of whole sentences. Chunks never cross a PDF page, so every citation has an exact page.
/// </summary>
public static partial class TextChunker
{
    private readonly record struct Unit(string Text, int Words, string Separator);

    public static List<Chunk> Split(IEnumerable<Page> pages, int maxWords, int overlapWords)
    {
        var chunks = new List<Chunk>();
        foreach (var page in pages)
        {
            var window = new List<Unit>();
            var words = 0;
            var fresh = 0;

            // PDF line breaks are just wrapping; in text and Word files they mean something (lists, table rows).
            foreach (var unit in Units(page.Text, maxWords, hardLineBreaks: page.Number is null))
            {
                if (words + unit.Words > maxWords && fresh > 0)
                {
                    chunks.Add(new(page.Number, Join(window)));
                    // Keep the last sentences (up to overlapWords) so a fact split across chunks is still found whole.
                    while (words > overlapWords)
                    {
                        words -= window[0].Words;
                        window.RemoveAt(0);
                    }

                    fresh = 0;
                }

                window.Add(unit);
                words += unit.Words;
                fresh++;
            }

            if (fresh > 0)
            {
                chunks.Add(new(page.Number, Join(window)));
            }
        }

        return chunks;
    }

    public static int CountWords(string text) => text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Length;

    private static IEnumerable<Unit> Units(string text, int maxWords, bool hardLineBreaks)
    {
        text = Hyphenation().Replace(text.Replace("\r\n", "\n"), "$1$2");
        foreach (var paragraph in BlankLine().Split(text))
        {
            var separator = "\n\n";
            foreach (var line in hardLineBreaks ? paragraph.Split('\n') : [paragraph])
            {
                foreach (var sentence in SentenceEnd().Split(line))
                {
                    var words = sentence.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
                    for (var i = 0; i < words.Length; i += maxWords)
                    {
                        var slice = words.AsSpan(i, Math.Min(maxWords, words.Length - i));
                        yield return new(string.Join(' ', slice.ToArray()), slice.Length, separator);
                        separator = " ";
                    }
                }

                if (separator == " ") separator = "\n";
            }
        }
    }

    private static string Join(List<Unit> window)
    {
        var text = new StringBuilder(window[0].Text);
        foreach (var unit in window.Skip(1)) text.Append(unit.Separator).Append(unit.Text);
        return text.ToString();
    }

    [GeneratedRegex(@"(\p{L})-\n\s*(\p{Ll})")]
    private static partial Regex Hyphenation();

    [GeneratedRegex(@"\n[ \t]*\n\s*")]
    private static partial Regex BlankLine();

    [GeneratedRegex(@"(?<=[.!?…])\s+")]
    private static partial Regex SentenceEnd();
}
