import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import type { ReportDetail } from "@/lib/data/report-detail";

// Helvetica / Helvetica-Bold are built into react-pdf — no Font.register needed.
// Default hyphenation breaks mid-word ("comple-to") on a poster meant to be
// scanned at a glance — disable it so long words wrap whole instead.
Font.registerHyphenationCallback((word) => [word]);

const COLORS = {
  ink: "#2B211C",
  inkSoft: "#6B5A50",
  lost: "#C1121F",
  found: "#2D6A4F",
  surfaceMuted: "#F6F1EA",
  border: "#E7DED2",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 34,
    fontFamily: "Helvetica",
    color: COLORS.ink,
    alignItems: "center",
  },
  badge: {
    paddingVertical: 9,
    paddingHorizontal: 26,
    borderRadius: 8,
    marginBottom: 18,
  },
  badgeText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    color: "#FFFFFF",
    letterSpacing: 3,
  },
  photo: {
    width: 230,
    height: 230,
    borderRadius: 16,
    objectFit: "cover",
    marginBottom: 18,
  },
  photoPlaceholder: {
    width: 230,
    height: 230,
    borderRadius: 16,
    marginBottom: 18,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontFamily: "Helvetica-Bold",
    fontSize: 38,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.inkSoft,
    marginBottom: 4,
    textAlign: "center",
  },
  address: {
    fontSize: 13,
    color: COLORS.inkSoft,
    marginBottom: 18,
    textAlign: "center",
    maxWidth: 340,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 18,
  },
  contactLabel: {
    fontSize: 12,
    color: COLORS.inkSoft,
    marginBottom: 5,
    textAlign: "center",
  },
  contactValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    marginBottom: 5,
    textAlign: "center",
  },
  footer: {
    marginTop: 18,
    alignItems: "center",
    gap: 6,
  },
  qr: {
    width: 84,
    height: 84,
  },
  qrCaption: {
    fontSize: 9,
    color: COLORS.inkSoft,
    textAlign: "center",
    width: 170,
  },
  brand: {
    marginTop: 12,
    fontSize: 9,
    color: COLORS.inkSoft,
  },
});

const SPECIES_LABEL: Record<string, string> = { dog: "Perro", cat: "Gato", other: "Mascota" };
const SIZE_LABEL: Record<string, string> = { small: "Chico", medium: "Mediano", large: "Grande" };

export function PosterDocument({
  report,
  qrDataUrl,
}: {
  report: ReportDetail;
  qrDataUrl: string;
}) {
  const isLost = report.type === "lost";
  const title = report.name ?? SPECIES_LABEL[report.species];
  const subtitleParts = [
    SPECIES_LABEL[report.species],
    report.size ? SIZE_LABEL[report.size] : null,
    ...report.tags,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.badge, { backgroundColor: isLost ? COLORS.lost : COLORS.found }]}>
          <Text style={styles.badgeText}>{isLost ? "SE BUSCA" : "ENCONTRADA"}</Text>
        </View>

        {report.photos[0] ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={report.photos[0]} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={{ fontSize: 14, color: COLORS.inkSoft }}>Sin foto</Text>
          </View>
        )}

        <Text style={styles.name}>{title}</Text>
        {subtitleParts.length > 0 && <Text style={styles.subtitle}>{subtitleParts.join(" · ")}</Text>}
        {report.address_label && <Text style={styles.address}>Última vez vista en: {report.address_label}</Text>}

        <View style={styles.divider} />

        <Text style={styles.contactLabel}>{isLost ? "¿La viste? Contactá a la familia" : "¿Es tuya? Contactanos"}</Text>
        {report.contact_whatsapp && <Text style={styles.contactValue}>{report.contact_whatsapp}</Text>}
        {report.contact_phone && <Text style={styles.contactValue}>{report.contact_phone}</Text>}

        <View style={styles.footer}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={qrDataUrl} style={styles.qr} />
          <Text style={styles.qrCaption}>Escaneá para ver el reporte completo y más fotos</Text>
        </View>

        <Text style={styles.brand}>Publicado con Pet Finder</Text>
      </Page>
    </Document>
  );
}

export async function downloadPoster(report: ReportDetail, reportUrl: string): Promise<void> {
  const [{ default: QRCode }, { pdf }] = await Promise.all([import("qrcode"), import("@react-pdf/renderer")]);

  const qrDataUrl = await QRCode.toDataURL(reportUrl, { margin: 1, width: 300 });
  const blob = await pdf(<PosterDocument report={report} qrDataUrl={qrDataUrl} />).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cartel-${(report.name ?? report.species).toLowerCase().replace(/\s+/g, "-")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
