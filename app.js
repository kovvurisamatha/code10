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
const getstatedetails = dbobject => {
  return {
    stateId: dbobject.state_id,
    stateName: dbobject.state_name,
    population: dbobject.population,
  }
}
app.get('/states/', authenticateToken, async (request, response) => {
  const allstatesquery = `select * from state`
  const dbresponse = await db.all(allstatesquery)
  response.send(dbresponse.map(eachstate => getstatedetails(eachstate)))
})
//api3
app.get('/states/:stateId/', authenticateToken, async (request, response) => {
  const {stateId} = request.params
  const getstatequery = `select * from state where state_id=${stateId}`
  const dbresponse = await db.get(getstatequery)
  response.send(getstatedetails(dbresponse))
})

//api4
app.post('/districts/', authenticateToken, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const adddistrictquery = `insert into district 
  (district_id,district_name,state_id,cases,cured,active,deaths)
  values('${districtName}',${stateId},'${cases}','${cured}','${active}','${deaths}')`
  const dbresponse = await db.run(adddistrictquery)
  const districtId = dbresponse.lastId
  response.send('District Successfully Added')
})
//api5
const getdistrictdetails = dbobject => {
  return {
    districtId: dbobject.district_id,
    districtName: dbobject.district_name,
    stateId: dbobject.state_id,
    cases: dbobject.cases,
    cured: dbobject.cured,
    active: dbobject.active,
    deaths: dbobject.active,
  }
}
app.get(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const getdistrictquery = `select * from district where 
  district_id=${districtId}`
    const dbresponse = await db.get(getdistrictquery)
    response.send(getdistrictdetails(dbresponse))
  },
)
//api6
app.delete(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const deletequery = `delete from district
  where district_id=${districtId}`
    const dbresponse = await db.run(deletequery)
    response.send('District Removed')
  },
)
//api7
app.put(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    const updatedistrict = `update district set
  district_name='${districtName}',
  state_id=${stateId},
  cases=${cases},
  cured=${cured},
  active=${active},
  deaths=${deaths}
  where district_id=${districtId}`
    await db.run(updatedistrict)
    response.send('District Details Updated')
  }
)
//api8
app.get(
  '/states/:stateId/stats/',
  authenticateToken,
  async (request, response) => {
    const {stateId} = request.params
    const gettotalquery = `select sum(cases),sum(cured),
  sum(active),sum(deaths) from district where state_id=${stateId}`
    const stats = db.get(gettotalquery)
    response.send({
      totalCases: stats['sum(cases)'],
      totalCured: stats['sum(cured)'],
      totalActive: stats['sum(active)'],
      totalDeaths: stats['sum(deaths)'],
    })
  },
)
