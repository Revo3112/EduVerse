# EduVerse Indexer

This is the official indexer for the EduVerse platform on Manta Pacific Sepolia Testnet. It indexes critical events for course management, licensing, progress tracking, and certificate issuance.

## Quick Start

```bash
# Install dependencies
npm install

# Generate types from ABIs and schema
npm run codegen

# Build subgraph
npm run build

# Deploy to development environment
./deploy.sh -e dev
```

## Project Structure

```
goldsky-indexer/
├── configs/              # Contract ABIs & deployment addresses
├── monitoring/           # Prometheus & Grafana configs
├── scripts/             # Deployment & validation scripts
├── src/                 # Subgraph mapping code
│   └── mappings/        
│       ├── courseFactory.ts    # Course CRUD events
│       ├── courseLicense.ts    # Enrollment & revenue events  
│       ├── progressTracker.ts  # Learning progress events
│       └── certificateManager.ts # Certificate events
├── schema.graphql       # GraphQL schema
└── subgraph.yaml       # Subgraph manifest
```

## Key Entities

- **Course**: Represents an educational course with metadata
- **CourseSection**: Individual course sections/modules
- **UserProfile**: User statistics and activity
- **License**: Course enrollment & access rights
- **Certificate**: Course completion certificates
- **TeacherStudent**: Many-to-many teacher-student relationships
- **MonthlyStats**: Time-series analytics data

## GraphQL Examples

### Teacher Dashboard Analytics
```graphql
query TeacherAnalytics($creator: Bytes!) {
  userProfile(id: $creator) {
    coursesCreated
    totalRevenue
    totalStudents
    averageRating
    revenueLastMonth
  }
  courses(where: { creator: $creator }) {
    id
    title
    totalEnrollments
    activeEnrollments
    completionRate
  }
}
```

### Student Progress
```graphql
query StudentProgress($student: Bytes!) {
  enrollments(where: { student: $student }) {
    course {
      title
      sectionsCount
    }
    completedSections
    progress
    isActive
    expiresAt
  }
}
```

### Certificate Analytics
```graphql
query CertificateStats {
  certificates(first: 100) {
    id
    recipient
    coursesIncluded {
      course {
        title
        creator
      }
    }
    issuedAt
    verificationHash
  }
}
```

## Deployment

```bash
# Development deployment
./deploy.sh -e dev -v 1.0.0

# Production deployment
./deploy.sh -e prod -v 1.0.0 --verify
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required
MANTA_PACIFIC_RPC="https://pacific-rpc.sepolia-testnet.manta.network/http"
GRAPH_DEPLOY_KEY="your-deploy-key"

# Optional
GOLDSKY_API_KEY="your-goldsky-key"  # For Goldsky deployment
```

## Monitoring 

1. Start monitoring stack:
```bash
cd monitoring
docker-compose up -d
```

2. Access dashboards:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

## Key Metrics

- Indexing latency: `subgraph_head_block_number - ethereum_chain_head_block_number`
- Error rate: `rate(subgraph_indexing_errors[5m])`
- Query performance: `rate(graphql_query_execution_time_seconds[5m])`

## Validation

```bash
# Verify contract events are properly indexed
npm run validate

# Test GraphQL queries
npm run test:queries

# Run end-to-end tests
npm test
```

## Contributing

1. Create feature branch: `git checkout -b feature/xyz`
2. Make changes & run tests: `npm test`
3. Create PR with description & schema changes

## License

MIT