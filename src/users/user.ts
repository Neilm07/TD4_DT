import { rsaEncrypt, createRandomSymmetricKey, exportSymKey, generateRsaKeyPair } from "../crypto";
import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT } from "../config";

async function buildCircuit(nodes: { nodeId: number; pubKey: string }[]): Promise<{ nodeId: number; pubKey: string }[]> {
  return nodes.sort(() => Math.random() - 0.5).slice(0, 3);
}

async function encryptOnionMessage(message: string, circuit: { nodeId: number; pubKey: string }[]): Promise<string> {
  let encryptedMessage = message;
  for (const { pubKey } of circuit.reverse()) {
    const symKey = await createRandomSymmetricKey();
    const symKeyB64 = await exportSymKey(symKey);
    const encryptedSymKey = await rsaEncrypt(symKeyB64, pubKey);
    encryptedMessage = encryptedSymKey + ":" + encryptedMessage;
  }
  return encryptedMessage;
}

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;

  _user.get("/status", (req, res) => {
    res.send("live");
  });

  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });

  _user.post("/message", (req, res) => {
    lastReceivedMessage = req.body.message;
    res.json({ status: "success" });
  });

  _user.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId } = req.body;
    try {
      const response = await fetch(`http://localhost:${BASE_USER_PORT + destinationUserId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`Error sending message to user ${destinationUserId}`);
      }

      lastSentMessage = message;
      res.json({ status: "Message sent successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(`User ${userId} is listening on port ${BASE_USER_PORT + userId}`);
  });

  return server;
}
