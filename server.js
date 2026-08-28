const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Location API is running!');
});

app.get('/api/v1/states', async (req, res) => {
  try {
    const states = await prisma.state.findMany();
    res.json(states);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/v1/districts', async (req, res) => {
  try {
    const districts = await prisma.district.findMany();
    res.json(districts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/villages', async (req, res) => {
  try {
    const villages = await prisma.village.findMany();
    res.json(villages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/v1/subdistricts', async (req, res) => {
  try {
    const subDistricts = await prisma.subDistrict.findMany();
    res.json(subDistricts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/states/:id/full', async (req, res) => {
  try {
    const state = await prisma.state.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        districts: {
          include: {
            subDistricts: {
              include: {
                villages: true
              }
            }
          }
        }
      }
    });
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});