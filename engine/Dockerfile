# Use the official Go image as the base image
FROM golang:1.22.0-alpine

# Set the working directory in the container
WORKDIR /app

# Copy go.mod and go.sum files
COPY go.mod go.sum ./

# Download all dependencies
RUN go mod download

# Copy the source code into the container
COPY . .

# Build the application
RUN go build -o main ./cmd

# Expose the port the app runs on
EXPOSE 8080

# Command to run the executable
CMD ["./main"] 