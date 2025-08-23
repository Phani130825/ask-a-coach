# InterviewAI Backend

A comprehensive backend service for the AI-powered interview preparation platform, built with Node.js, Express, and MongoDB.

## 🚀 Features

### Core Functionality

- **User Authentication & Management**: JWT-based authentication with user profiles and preferences
- **Resume Processing**: AI-powered resume analysis, parsing, and tailoring
- **Interview Simulation**: Dynamic question generation and real-time evaluation
- **Performance Analytics**: Comprehensive performance tracking and insights
- **AI Services**: OpenAI integration for intelligent content generation and analysis

### Technical Features

- **Real-time Communication**: Socket.IO for live interview sessions
- **File Processing**: PDF and Word document parsing
- **Rate Limiting**: API protection and abuse prevention
- **Error Handling**: Comprehensive error management and logging
- **Security**: Helmet, CORS, and input validation

## 🏗️ Architecture

```
backend/
├── config/          # Database and service configuration
├── middleware/      # Authentication and error handling
├── models/          # MongoDB schemas and models
├── routes/          # API endpoint definitions
├── services/        # Business logic and AI integration
├── uploads/         # File storage
└── server.js        # Main application entry point
```

## 📋 Prerequisites

- Node.js 18+
- MongoDB 5+
- OpenAI API key
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   cd ask-a-coach/backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**

   ```bash
   cp env.example .env
   ```

   Edit `.env` with your configuration:

   ```env
   # Required
   OPENAI_API_KEY=your-openai-api-key
   JWT_SECRET=your-jwt-secret
   MONGODB_URI=your-mongodb-connection-string

   # Optional
   PORT=5000
   NODE_ENV=development
   ```

4. **Start the server**

   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `GET /api/auth/me` - Get current user profile

### User Management

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/preferences` - Update user preferences
- `PUT /api/users/password` - Change password
- `GET /api/users/stats` - Get user statistics

### Resume Management

- `POST /api/resumes/upload` - Upload and parse resume
- `GET /api/resumes` - Get user's resumes
- `GET /api/resumes/:id` - Get specific resume
- `POST /api/resumes/:id/analyze` - Analyze resume against job description
- `POST /api/resumes/:id/tailor` - Create tailored resume version
- `GET /api/resumes/:id/templates` - Get available templates
- `POST /api/resumes/:id/generate-template` - Generate resume with template

### Interview Management

- `POST /api/interviews/create` - Create interview session
- `GET /api/interviews` - Get user's interviews
- `GET /api/interviews/:id` - Get interview details
- `POST /api/interviews/:id/start` - Start interview session
- `POST /api/interviews/:id/response` - Submit interview response
- `POST /api/interviews/:id/end` - End interview session
- `POST /api/interviews/:id/recording` - Upload interview recording

### Analytics

- `GET /api/analytics/dashboard` - Get dashboard analytics
- `GET /api/analytics/performance` - Get performance metrics
- `GET /api/analytics/resume-insights` - Get resume insights
- `GET /api/analytics/compare` - Compare performance across periods
- `POST /api/analytics/feedback` - Generate personalized feedback
- `GET /api/analytics/export` - Export analytics data

### AI Services

- `POST /api/ai/chat` - Chat with AI coach
- `POST /api/ai/feedback` - Get AI feedback on responses
- `POST /api/ai/resume-tips` - Get resume tips
- `POST /api/ai/interview-prep` - Get preparation plan
- `POST /api/ai/skill-analysis` - Analyze skills
- `POST /api/ai/company-research` - Company research insights

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 📊 Database Models

### User

- Authentication details
- Profile information
- Subscription status
- Preferences and settings
- Performance statistics

### Resume

- Original file information
- Parsed content data
- AI analysis results
- Tailored versions
- Template information

### Interview

- Session configuration
- Questions and responses
- Performance evaluation
- Non-verbal analysis
- Recording metadata

## 🤖 AI Integration

The backend integrates with OpenAI's GPT models for:

- **Resume Analysis**: Skills matching and optimization suggestions
- **Question Generation**: Context-aware interview questions
- **Response Evaluation**: Intelligent feedback and scoring
- **Content Tailoring**: Personalized resume optimization
- **Performance Insights**: Detailed improvement recommendations

## 🔄 Real-time Features

Socket.IO integration provides:

- Live interview sessions
- Real-time response evaluation
- Progress tracking
- Session management

## 📁 File Handling

- **Supported Formats**: PDF, DOCX, DOC
- **File Size Limit**: 10MB (configurable)
- **Storage**: Local file system with Cloudinary integration option
- **Processing**: Background parsing and analysis

## 🚦 Rate Limiting

- **Window**: 15 minutes
- **Limit**: 100 requests per IP
- **Headers**: Rate limit information included in responses

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📝 Environment Variables

| Variable         | Description               | Default                     |
| ---------------- | ------------------------- | --------------------------- |
| `PORT`           | Server port               | 5000                        |
| `NODE_ENV`       | Environment mode          | development                 |
| `MONGODB_URI`    | MongoDB connection string | localhost:27017/interviewai |
| `JWT_SECRET`     | JWT signing secret        | required                    |
| `OPENAI_API_KEY` | OpenAI API key            | required                    |
| `OPENAI_MODEL`   | OpenAI model to use       | gpt-4                       |
| `FRONTEND_URL`   | Frontend application URL  | http://localhost:5173       |

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🔧 Development

### Code Style

- ESLint configuration included
- Prettier formatting
- Consistent error handling
- Comprehensive logging

### Database Migrations

- Mongoose schemas with versioning
- Automatic indexing
- Data validation

### Error Handling

- Centralized error middleware
- Structured error responses
- Development vs production error details

## 📚 API Documentation

For detailed API documentation, see the individual route files or use tools like Swagger/OpenAPI.

## 🤝 Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:

- Check the API documentation
- Review error logs
- Ensure environment variables are set correctly
- Verify MongoDB connection and OpenAI API key

## 🔮 Future Enhancements

- Video analysis integration
- Advanced analytics dashboard
- Multi-language support
- Mobile app API endpoints
- Webhook integrations
- Advanced caching strategies
