FROM node:18-alpine

# Cài đặt các dependency cần thiết
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

# Copy package.json và package-lock.json 
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy toàn bộ code nguồn
COPY . .

# Tạo thư mục uploads nếu chưa tồn tại
RUN mkdir -p /app/uploads

# Đặt quyền cho thư mục uploads
RUN chmod -R 755 /app/uploads

# Đặt biến môi trường
ENV NODE_ENV=production
ENV PORT=4000

# Mở cổng 4000
EXPOSE 4000

# Chạy ứng dụng
CMD ["node", "index.js"]
