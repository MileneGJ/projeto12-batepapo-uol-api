import express from "express";
import cors from 'cors';
import dayjs from "dayjs";
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URL);
let db

app.post("/participants", async (req, res) => {

    //Code for Validation//

    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12Database");
        await db.collection("participants").insertOne({
            name: req.body.name,
            lastStatus: Date.now()
        });

        await db.collection("messages").insertOne({
            from: req.body.name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs(new Date()).format('HH:mm:ss')
        });
        res.sendStatus(201);
        //mongoClient.close();
    } catch {
        res.sendStatus(500);
        //mongoClient.close();
    }
});

app.get("/participants", async (_, res) => {
    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12Database");
        const AllUsers = await db.collection("participants").find({}).toArray()
        res.send(AllUsers);
        //mongoClient.close();
    } catch {
        res.sendStatus(500);
        //mongoClient.close();
    }
});

app.post("/messages", async (req, res) => {

    //Code for Validation//

    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12Database");
        await db.collection("messages").insertOne({
            from: req.header.user,
            to: req.body.to,
            text: req.body.text,
            type: req.body.type,
            time: dayjs(new Date()).format('HH:mm:ss')
        });
        res.sendStatus(201);
        //mongoClient.close();
    } catch {
        res.sendStatus(500);
        //mongoClient.close();
    }
});


app.get("/messages", async (req, res) => {
    const limit = parseInt(req.query.limit);
    let messagesToSend

    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12Database");
        const AllMessages = await db.collection("messages").find({}).toArray()

        if (!limit || limit >= AllMessages.length) {
            messagesToSend = AllMessages
        } else {
            let lastMessage = (AllMessages.length - 1)
            messagesToSend = AllMessages.slice((lastMessage - limit), lastMessage)
        }
        res.send(messagesToSend);
        //mongoClient.close();
    } catch {
        res.sendStatus(500);
        //mongoClient.close();
    }
});


app.post("/status", (req, res) => {
    res.send("OK")
})

app.listen(5000);