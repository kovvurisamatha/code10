const express = require('express')
const app = express()
app.use(express.json())
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dbpath = path.join(__dirname, 'covid19IndiaPortal.db')
let db = null
const initialandstartdb = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('app running at http://localhost:3000/')
    })
  } catch (e) {
    console.log('db error:${e.message}')
    process.exit(1)
  }
}
initialandstartdb()
module.exports = app
const authenticateToken = (request, response, next) => {
  let jwtToken
  const authheaders = request.headers['authorization']
  if (authheaders !== undefined) {
    jwtToken = authheaders.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'samatha', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

//api1
app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const hashedpassword = await bcrypt.hash(password, 10)
  const selectuser = `select * from user where username='${username}'`
  const dbuser = await db.get(selectuser)
  if (dbuser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const ispasswordmatch = await bcrypt.compare(password, dbuser.password)
    if (ispasswordmatch === true) {
      const payload = {username: username}
      let jwtToken = jwt.sign(payload, 'samatha')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})
//api2
app.get('/states/', authenticateToken, async (request, response) => {
  const allstatesquery = `select * from state`
  const dbresponse = await db.all(allstatesquery)
})
