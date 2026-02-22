export async function sendPushNotifications(tokens, title, body, data = {}) {
  if (!tokens.length) return;

  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title,
    body,
    data,
  }));

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });
}