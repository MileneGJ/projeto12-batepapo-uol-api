import express from "express";
import cors from 'cors';
import dayjs from "dayjs";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from 'dotenv';
import joi from 'joi'

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URL);
let db

app.post("/participants", async (req, res) => {

    const ParticipantSchema = joi.object({
        name: joi.string().min(1).required()
    });
    const validation = ParticipantSchema.validate(req.body)
    if (validation.error) {
        res.sendStatus(422);
        return
    }
    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12Database");
        const participant = await db.collection("participants").findOne({ name: req.body.name })
        if (participant) {
            mongoClient.close()
            res.sendStatus(409);
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
        mongoClient.close();
        res.sendStatus(201);
    } catch {
        mongoClient.close();
        res.sendStatus(500);
    }
});

app.get("/participants", async (_, res) => {
    let AllUsers
    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12Database");
        AllUsers = await db.collection("participants").find().toArray();
        mongoClient.close();
        res.send(AllUsers);
    } catch {
        mongoClient.close();
        res.sendStatus(500);
    }
});

app.post("/messages", async (req, res) => {

    const MessageSchema = joi.object({
        to: joi.string().min(1).required(),
        text: joi.string().min(1).required(),
        type: joi.string().valid('message', 'private_message').required(),
    })
    let validation = MessageSchema.validate(req.body)
    if (validation.error) {
        res.sendStatus(422);
        return
    }

    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12Database");

        // Validação do usuário a ser inserido no 'from'
        let AllUsers = await db.collection("participants").find().toArray();
        AllUsers = AllUsers.map(user => user.name);
        let ArrayUsers = new Array(...AllUsers)
        let UserSchema = joi.object({
            user: joi.string().valid(...ArrayUsers).required()
        })
        let validationUser = UserSchema.validate({ user: req.headers.user });
        if (validationUser.error) {
            mongoClient.close();
            res.sendStatus(422);
            return
        }

        await db.collection("messages").insertOne({
            from: req.headers.user,
            to: req.body.to,
            text: req.body.text,
            type: req.body.type,
            time: dayjs(new Date()).format('HH:mm:ss')
        });
        mongoClient.close();
        res.sendStatus(201);

    } catch {
        mongoClient.close();
        res.sendStatus(500);
    }
});


app.get("/messages", async (req, res) => {
    let limit = parseInt(req.query.limit);
    let AllMessages
    let messagesToSend

    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12Database");
        AllMessages = await db.collection("messages").find({
            $or: [
                { to: 'Todos' },
                { type: 'message' },
                {
                    $and: [{ type: 'private_message' },
                    { $or: [{ to: req.headers.user }, { from: req.headers.user }] }]
                }
            ]
        }).toArray()
        if (!limit || limit >= AllMessages.length) {
            messagesToSend = AllMessages
        } else {
            messagesToSend = AllMessages.slice(limit * (-1))
        }
        mongoClient.close();
        res.send(messagesToSend);
    } catch {
        mongoClient.close();
        res.sendStatus(500);
    }
});


app.post("/status", async (req, res) => {
    let participant
    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12Database");
        participant = await db.collection("participants").findOne({ name: req.headers.user })
        if (!participant) {
            mongoClient.close()
            res.sendStatus(404)
            return;
        }
        const participantID= new ObjectId(participant._id)
        await db.collection("participants").updateOne({
            _id: participantID
        }, { $set: { lastStatus: Date.now() } })
        mongoClient.close()
        res.sendStatus(200)
    } catch (error) {
        mongoClient.close()
        res.sendStatus(500)
    }
});

//Remover usuário após inatividade de mais de 10 segundos
setInterval(async () => {
    let participant
    await mongoClient.connect();
    db = mongoClient.db("projeto12Database");
    participant = await db.collection("participants")
        .findOne({ lastStatus: { $lt: Date.now() - 10 * 1000 } })
    if (participant) {
        await db.collection("participants").deleteOne({ _id: participant._id })
        await db.collection("messages").insertOne({
            from: participant.name,
            to: 'Todos',
            text: 'sai da sala...',
            type: 'status',
            time: dayjs(new Date()).format('HH:mm:ss')
        })
    }
    mongoClient.close();
}, 15000)

app.delete("/messages/:messageId", async (req, res) => {
    const messageId = new ObjectId(req.params.messageId)
    let message
    try {
        await mongoClient.connect();
        db = mongoClient.db("projeto12Database");
        message = await db.collection("messages").findOne({ _id: messageId })
        if (!message) {
            mongoClient.close()
            res.sendStatus(404);
            return
        }
        if (message.from !== req.headers.user) {
            mongoClient.close()
            res.send(401);
            return
        }
        await db.collection("messages").deleteOne({ _id: messageId })
        mongoClient.close()
        res.sendStatus(200)
    } catch (error) {
        mongoClient.close()
        res.sendStatus(500)
    }
})


app.listen(5000);