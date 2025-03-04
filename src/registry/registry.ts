import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";
import { generateRsaKeyPair, exportPubKey } from "../crypto";

export type Node = { nodeId: number; pubKey: string };
export type RegisterNodeBody = { nodeId: number; pubKey: string };
export type GetNodeRegistryBody = { nodes: Node[] };

const nodes: Node[] = [];

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  _registry.get("/status", (req, res) => {
    res.send("live");
  });

  _registry.post("/registerNode", (req: Request, res: Response) => {
    const { nodeId, pubKey } = req.body as RegisterNodeBody;
    if (!nodes.find(n => n.nodeId === nodeId)) {
      nodes.push({ nodeId, pubKey });
    }
    res.json({ status: "Node registered" });
  });

  _registry.get("/getNodeRegistry", (req, res) => {
    res.json({ nodes });
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`Registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}