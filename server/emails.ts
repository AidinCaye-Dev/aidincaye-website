// Email bodies for the contact form: a plain-text version and a styled HTML version of each.
// SECURITY: every visitor-supplied value is HTML-escaped before it goes anywhere near markup; the only link built
// from visitor input is a mailto: whose address was validated and is URL-encoded. No scripts, no remote images,
// no remote CSS (nothing is fetched when the email is opened, so it cannot track the reader).

import { LOGO_CID, LOGO_W, LOGO_H } from "./logo.ts";
import { BRAND } from "./brand.ts";

export interface Enquiry {
  ref: string;
  name: string;
  email: string;
  organisation?: string;
  eventDate?: string;
  venue?: string;
  message: string;
}

// Same layout as TiMO ODV's booking emails, in Aidin's light palette (the site's CSS tokens).
const ACCENT = "#0b0b0c"; // --ink: header band, rules, buttons
const INK = "#0b0b0c";    // --ink: headings and values
const BODY = "#44474d";   // --ink-2: body copy
const MUTED = "#66696f";  // --ink-3: labels and small print
const LINE = "#d9d6cf";   // --line
const PAPER = "#f4f3f0";  // --paper: outer background, message panel, footer
const PAPER2 = "#ebe9e4"; // --paper-2
const FONT = "Jost, Futura, 'Century Gothic', 'Helvetica Neue', Arial, sans-serif";
const DISPLAY = FONT;

export const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const para = (s: string) => esc(s).replace(/\r?\n/g, "<br>");

const rows = (e: Enquiry) => {
  const r: [string, string][] = [["Name", esc(e.name)], ["Email", `<a href="mailto:${encodeURIComponent(e.email).replace(/%40/g, "@")}" style="color:${ACCENT};text-decoration:none;">${esc(e.email)}</a>`]];
  if (e.organisation) r.push(["Organisation", esc(e.organisation)]);
  if (e.eventDate) r.push(["Event date", esc(e.eventDate)]);
  if (e.venue) r.push(["Venue &amp; city", esc(e.venue)]);
  return r;
};

const detailsTable = (e: Enquiry) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">` +
  rows(e).map(([k, v]) => `<tr><td style="padding:10px 0;border-bottom:1px solid ${LINE};width:130px;font:600 12px ${FONT};letter-spacing:1.2px;text-transform:uppercase;color:${MUTED};vertical-align:top;">${k}</td><td style="padding:10px 0;border-bottom:1px solid ${LINE};font:15px/1.5 ${FONT};color:${INK};vertical-align:top;">${v}</td></tr>`).join("") +
  `</table>`;

const messageBlock = (e: Enquiry) =>
  `<p style="margin:26px 0 8px;font:600 12px ${FONT};letter-spacing:1.2px;text-transform:uppercase;color:${MUTED};">Message</p>` +
  `<div style="border-left:4px solid ${ACCENT};background:${PAPER};padding:16px 18px;font:15px/1.65 ${FONT};color:${INK};">${para(e.message)}</div>`;

const shell = (preheader: string, title: string, body: string, footer: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${PAPER2};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAPER2};">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER2};"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden;">
<tr><td style="background:${ACCENT};padding:26px 32px 22px;border-bottom:4px solid ${LINE};"><img src="cid:${LOGO_CID}" width="${Math.round(LOGO_W / 2.4)}" height="${Math.round(LOGO_H / 2.4)}" alt="${esc(BRAND.name)}" style="display:block;border:0;width:${Math.round(LOGO_W / 2.4)}px;height:auto;font:700 24px ${FONT};color:#ffffff;"></td></tr>
<tr><td style="padding:34px 32px 30px;">${body}</td></tr>
<tr><td style="padding:20px 32px 28px;border-top:1px solid ${LINE};background:${PAPER};font:12px/1.6 ${FONT};color:${MUTED};">${footer}</td></tr>
</table></td></tr></table></body></html>`;

const refChip = (ref: string) =>
  `<span style="display:inline-block;margin-top:10px;padding:5px 12px;border:1px solid ${LINE};border-radius:20px;font:600 12px ${FONT};letter-spacing:1.6px;color:${INK};">REF &nbsp;${esc(ref)}</span>`;

// ---- Email for the booking team ----
export function enquiryEmail(e: Enquiry): { text: string; html: string } {
  const text = [`Reference: ${e.ref}`, `Name: ${e.name}`, `Email: ${e.email}`,
    ...(e.organisation ? [`Organisation: ${e.organisation}`] : []), ...(e.eventDate ? [`Event date: ${e.eventDate}`] : []), ...(e.venue ? [`Venue & city: ${e.venue}`] : []),
    "", e.message, "", "Reply to this email to answer the sender directly."].join("\n");
  const body =
    `<p style="margin:0;font:600 12px ${FONT};letter-spacing:2px;text-transform:uppercase;color:${ACCENT};">New booking enquiry</p>` +
    `<h1 style="margin:8px 0 0;font:500 30px/1.15 ${DISPLAY};letter-spacing:3px;text-transform:uppercase;color:${INK};">${esc(e.name)}</h1>` +
    refChip(e.ref) + `<div style="height:22px;"></div>` + detailsTable(e) + messageBlock(e) +
    `<p style="margin:28px 0 0;"><a href="mailto:${encodeURIComponent(e.email).replace(/%40/g, "@")}?subject=${encodeURIComponent(`Re: your enquiry to ${BRAND.name} [${e.ref}]`)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font:700 13px ${FONT};letter-spacing:1.4px;text-transform:uppercase;padding:13px 24px;border-radius:3px;">Reply to ${esc(e.name.split(" ")[0] || "sender")}</a></p>`;
  const html = shell(`New enquiry from ${e.name} (${e.ref})`, `Booking enquiry ${e.ref}`, body,
    `Sent from the ${esc(BRAND.name)} website contact form. Replying to this email goes straight to the sender.`);
  return { text, html };
}

// ---- Copy for the person who sent the enquiry ----
export function copyEmail(e: Enquiry): { text: string; html: string } {
  const text = [`Thanks for contacting ${BRAND.name}. This is a copy of your enquiry for your records.`, `Reference: ${e.ref}`, "",
    `Name: ${e.name}`, `Email: ${e.email}`, ...(e.organisation ? [`Organisation: ${e.organisation}`] : []), ...(e.eventDate ? [`Event date: ${e.eventDate}`] : []), ...(e.venue ? [`Venue & city: ${e.venue}`] : []),
    "", e.message, "", "We will reply to this email address. If you did not send this enquiry, you can ignore this message.", "", BRAND.name].join("\n");
  const body =
    `<p style="margin:0;font:600 12px ${FONT};letter-spacing:2px;text-transform:uppercase;color:${ACCENT};">Enquiry received</p>` +
    `<h1 style="margin:8px 0 0;font:500 30px/1.15 ${DISPLAY};letter-spacing:3px;text-transform:uppercase;color:${INK};">Thanks, ${esc(e.name.split(" ")[0] || "there")}</h1>` +
    `<p style="margin:14px 0 0;font:16px/1.6 ${FONT};color:${BODY};">We have your enquiry and will reply to this email address. Here is a copy for your records.</p>` +
    refChip(e.ref) + `<div style="height:24px;"></div>` + detailsTable(e) + messageBlock(e);
  const html = shell(`Your booking request (${e.ref})`, "Your booking request", body,
    `You are receiving this because someone used the contact form on the ${esc(BRAND.name)} website with this email address. If that was not you, you can ignore this message and nothing further will be sent.`);
  return { text, html };
}
