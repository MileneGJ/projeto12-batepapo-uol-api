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
        const participant = await db.collection("participants").findOne({name:req.body.name})
        if(participant){
            res.sendStatus(409);
            mongoClient.close()
            return;
        }
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
        mongoClient.close();
    } catch {
        res.sendStatus(500);
        mongoClient.close();
    }
});

app.get("/participants", async (_, res) => {
    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12Database");
        let AllUsers = await db.collection("participants").find().toArray()
        res.send(AllUsers);
        mongoClient.close();
    } catch {
        res.sendStatus(500);
        mongoClient.close();
    }
});

app.post("/messages", async (req, res) => {

    //Code for Validation//

    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12Database");
        await db.collection("messages").insertOne({
            from: req.headers.user,
            to: req.body.to,
            text: req.body.text,
            type: req.body.type,
            time: dayjs(new Date()).format('HH:mm:ss')
        });
        res.sendStatus(201);
        mongoClient.close();
    } catch {
        res.sendStatus(500);
        mongoClient.close();
    }
});


app.get("/messages", async (req, res) => {
    let limit = parseInt(req.query.limit);
    let messagesToSend

    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12Database");
        let AllMessages = await db.collection("messages").find({
            $or: [
                { type: 'status' },
                { type: 'message' },
                {
                    $and: [{ type: 'private_message' },
                    { $or: [{ to: req.headers.user }, { from: req.headers.user }] }]
                }
            ]
        })
            .toArray()

        if (!limit || limit >= AllMessages.length) {
            messagesToSend = AllMessages
        } else {
            messagesToSend = AllMessages.slice(limit * (-1))
        }
        res.send(messagesToSend);
        mongoClient.close();
    } catch {
        res.sendStatus(500);
        mongoClient.close();
    }
});


app.post("/status", async (req, res) => {
    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12Database");
        const participant = await db.collection("participants").findOne({ name: req.headers.user })
        if (!participant) {
            res.sendStatus(404)
            mongoClient.close()
            return;
        }
        await db.collection("participants").updateOne({
            _id: participant._id
        }, { $set: { lastStatus: Date.now() } })
        res.sendStatus(200)
        mongoClient.close()
    } catch (error) {
        res.sendStatus(500)
        mongoClient.close()
    }
});

setInterval(async () => {
    await mongoClient.connect();
    db = mongoClient.db("projeto12Database");
    const participant = await db.collection("participants")
        .findMany({ lastStatus: { $lt: Date.now() - 10 * 1000 } })
    if (participant) {
        for (let i = 0; i < participant.length; i++) {
            await db.collection("participants").deleteOne({ _id: participant[i]._id })
            await db.collection("messages").insertOne({
                from: participant[i].name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time: dayjs(new Date()).format('HH:mm:ss')
            })
        }
    }
}, 15000)

app.listen(5000);