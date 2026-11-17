using System.IO.Compression;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace AiDocChat.Api.Services;

/// <summary>Text of one PDF page, or of a whole non-paged file (Number is null).</summary>
public sealed record Page(int? Number, string Text);

public static class TextExtractor
{
    public static readonly string[] Extensions = [".pdf", ".docx", ".txt", ".md", ".markdown", ".csv", ".json", ".log"];

    public static List<Page> Extract(Stream content, string extension) => extension switch
    {
        ".pdf" => Pdf(content),
        ".docx" => [new(null, Docx(content))],
        _ => [new(null, new StreamReader(content, Encoding.UTF8, detectEncodingFromByteOrderMarks: true).ReadToEnd())],
    };

    private static List<Page> Pdf(Stream content)
    {
        using var pdf = PdfDocument.Open(content);
        return [.. pdf.GetPages().Select(p => new Page(p.Number, ContentOrderTextExtractor.GetText(p)))];
    }

    // A .docx is a zip; the body is word/document.xml. UploadGuard has already checked the archive limits.
    internal static string Docx(Stream content)
    {
        using var zip = new ZipArchive(content, ZipArchiveMode.Read, leaveOpen: true);
        var entry = zip.GetEntry("word/document.xml") ?? throw new InvalidDataException("The Word file has no document body.");
        using var reader = XmlReader.Create(entry.Open(), new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null });
        XNamespace w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

        var text = new StringBuilder();
        foreach (var paragraph in XDocument.Load(reader).Descendants(w + "p"))
        {
            foreach (var node in paragraph.Descendants())
            {
                if (node.Name == w + "t") text.Append(node.Value);
                else if (node.Name == w + "tab") text.Append('\t');
                else if (node.Name == w + "br" || node.Name == w + "cr") text.Append('\n');
            }

            text.Append("\n\n");
        }

        return text.ToString();
    }
}
