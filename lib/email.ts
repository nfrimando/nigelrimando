import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function notifyVisitorMessage({
  message,
  senderHandle,
}: {
  message: string;
  senderHandle: string | null;
}) {
  await resend.emails.send({
    from: "noreply@www.padelsense.app",
    to: "nfrimando@gmail.com",
    subject: "New visitor message on your site",
    text: [
      `From: ${senderHandle ?? "(anonymous)"}`,
      "",
      message,
    ].join("\n"),
  });
}
