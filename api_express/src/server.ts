import Express from "express";
import router from "./router";
import db from "./config/database";
import cors, { CorsOptions } from 'cors'

const server =  Express()

async function conectarDB(){
    try{
        await db.authenticate()
        db.sync()
        console.log('COnexion a base de gatos exitosa')
    } catch (error){
        console.log ('no se pudo conectar a la BD')
        console.log(error)
    }
}
conectarDB()

const corsOptions: CorsOptions = {
    origin: function(origin,callback){
        if(!origin || origin===process.env.FRONTEND_URL){
            callback(null,true)
        }else{
            callback(new Error('error de cors'),false)
        }
    },
}
server.use(cors(corsOptions))

server.use(Express.json())

server.use('/api',router)

export default server                 
