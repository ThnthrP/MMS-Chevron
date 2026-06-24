FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 4100
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]