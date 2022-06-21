import express from "express";
import cors from 'cors';
import dayjs from "dayjs";


const app = express();

app.use(cors);

const participants = [];
const messages = [];

app.post("/participants",(req,res)=>{
    
    //Code for Validation//

    participants.push({
        name:req.body.name,
        lastStatus:Date.now()
    });
    messages.push({
        from: req.body.name, 
        to: 'Todos', 
        text: 'entra na sala...', 
        type: 'status', 
        time: dayjs(new Date(),'HH:mm:ss')
    });

    res.status(201);
});

app.get("/participants",(_,res)=>{
    res.send(participants)
});

app.post("/messages",()=>{})
app.get("/messages",()=>{})
app.post("/status",()=>{})

app.listen(5000);