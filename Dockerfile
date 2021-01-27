FROM node:14

# Create app directory
WORKDIR /app

RUN git clone https://github.com/Webprogrammierung-B3/projekt.git .

RUN npm ci

EXPOSE 8080
CMD ["npm", "start"]
