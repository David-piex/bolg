# Rinana Java Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the site as a self-hosted split system with a Next.js frontend, Spring Boot backend, PostgreSQL, Redis, MinIO, Nginx, and Docker Compose.

**Architecture:** Keep the existing Next.js UI shell and replace the Supabase/R2 runtime with a Spring Boot REST API under `/api`. The backend owns authentication, invite registration, roles, membership visibility, content metadata, media metadata, MinIO access, and admin audit logs. Docker Compose runs `frontend`, `backend`, `postgres`, `redis`, `minio`, and `nginx` as a single-machine deployment target.

**Tech Stack:** Next.js 15, React 19, Spring Boot 3, Java 17, PostgreSQL, Redis, MinIO S3 API, Flyway, Spring Security, Docker Compose, Nginx, Vitest, JUnit 5.

---

## Scope Notes

This plan implements the confirmed design in phases. The local machine currently has Java 17 available, but `docker` is not available in PATH. Docker Compose files can be authored locally, while full container verification must run on the target server or a machine with Docker installed.

The current worktree is dirty with prior Cloudflare/R2/Supabase migration work. Do not revert unrelated changes. Touch only files needed for each task and commit frequently.

## File Structure

Create a new backend while keeping the existing frontend at the repository root:

```text
personal-media-site/
  backend/
    pom.xml
    src/main/java/com/rinana/media/
      RinanaMediaApplication.java
      auth/
      common/
      content/
      invite/
      media/
      security/
      user/
    src/main/resources/
      application.yml
      db/migration/
    src/test/java/com/rinana/media/
  deploy/
    docker-compose.yml
    nginx/site.conf
    env/backend.env.example
    env/postgres.env.example
    env/minio.env.example
  src/
    services/java-api-client.ts
    services/java-api-client.test.ts
```

Responsibility split:

- `backend/auth`: login, register, refresh, logout, `/api/auth/me`.
- `backend/user`: user records, roles, membership levels, disabled status.
- `backend/invite`: invite code generation, consumption, validation.
- `backend/content`: posts, albums, videos, visibility filtering.
- `backend/media`: MinIO upload, object metadata, presigned access URLs.
- `backend/security`: JWT, refresh-token cookies, authorization rules.
- `backend/common`: error responses, time providers, enums, audit helpers.
- `src/services/java-api-client.ts`: frontend-only API client that replaces direct Supabase/R2 calls.

## Phase 1: Backend Skeleton and Domain Model

### Task 1: Create Spring Boot Backend Skeleton

**Files:**
- Create: `backend/pom.xml`
- Create: `backend/src/main/java/com/rinana/media/RinanaMediaApplication.java`
- Create: `backend/src/main/resources/application.yml`
- Create: `backend/src/test/java/com/rinana/media/RinanaMediaApplicationTests.java`

- [ ] **Step 1: Create a failing smoke test**

Create `backend/src/test/java/com/rinana/media/RinanaMediaApplicationTests.java`:

```java
package com.rinana.media;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class RinanaMediaApplicationTests {
  @Test
  void contextLoads() {
  }
}
```

- [ ] **Step 2: Run test and verify it fails because backend does not exist**

Run:

```powershell
cd backend
mvn test
```

Expected: FAIL before `pom.xml` and application class exist.

- [ ] **Step 3: Add Maven project**

Create `backend/pom.xml`:

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.8</version>
    <relativePath/>
  </parent>

  <groupId>com.rinana</groupId>
  <artifactId>media</artifactId>
  <version>0.1.0</version>
  <name>rinana-media</name>

  <properties>
    <java.version>17</java.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>
    <dependency>
      <groupId>org.flywaydb</groupId>
      <artifactId>flyway-core</artifactId>
    </dependency>
    <dependency>
      <groupId>org.flywaydb</groupId>
      <artifactId>flyway-database-postgresql</artifactId>
    </dependency>
    <dependency>
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>io.minio</groupId>
      <artifactId>minio</artifactId>
      <version>8.5.14</version>
    </dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-api</artifactId>
      <version>0.12.6</version>
    </dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-impl</artifactId>
      <version>0.12.6</version>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-jackson</artifactId>
      <version>0.12.6</version>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.security</groupId>
      <artifactId>spring-security-test</artifactId>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>com.h2database</groupId>
      <artifactId>h2</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>
```

- [ ] **Step 4: Add application class**

Create `backend/src/main/java/com/rinana/media/RinanaMediaApplication.java`:

```java
package com.rinana.media;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class RinanaMediaApplication {
  public static void main(String[] args) {
    SpringApplication.run(RinanaMediaApplication.class, args);
  }
}
```

- [ ] **Step 5: Add test-friendly application config**

Create `backend/src/main/resources/application.yml`:

```yaml
spring:
  application:
    name: rinana-media
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/rinana}
    username: ${DATABASE_USERNAME:rinana}
    password: ${DATABASE_PASSWORD:rinana}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true

server:
  port: ${SERVER_PORT:8080}

rinana:
  auth:
    jwt-secret: ${JWT_SECRET:dev-only-change-this-secret-with-at-least-32-bytes}
    access-token-minutes: 15
    refresh-token-days: 14
  super-admin:
    username: ${SUPER_ADMIN_USERNAME:admin}
    email: ${SUPER_ADMIN_EMAIL:admin@example.com}
    password: ${SUPER_ADMIN_PASSWORD:admin123456}
    display-name: ${SUPER_ADMIN_DISPLAY_NAME:站长}
  minio:
    endpoint: ${MINIO_ENDPOINT:http://localhost:9000}
    access-key: ${MINIO_ACCESS_KEY:minioadmin}
    secret-key: ${MINIO_SECRET_KEY:minioadmin}
    bucket: ${MINIO_BUCKET:rinana-media}
```

- [ ] **Step 6: Run backend smoke test**

Run:

```powershell
cd backend
mvn test
```

Expected: PASS for `RinanaMediaApplicationTests`.

- [ ] **Step 7: Commit**

```powershell
git add backend/pom.xml backend/src/main/java/com/rinana/media/RinanaMediaApplication.java backend/src/main/resources/application.yml backend/src/test/java/com/rinana/media/RinanaMediaApplicationTests.java
git commit -m "feat: add Spring Boot backend skeleton"
```

### Task 2: Add Core Enums and Visibility Policy

**Files:**
- Create: `backend/src/main/java/com/rinana/media/common/Role.java`
- Create: `backend/src/main/java/com/rinana/media/common/MemberLevel.java`
- Create: `backend/src/main/java/com/rinana/media/common/UserStatus.java`
- Create: `backend/src/main/java/com/rinana/media/common/ContentVisibility.java`
- Create: `backend/src/main/java/com/rinana/media/security/VisibilityPolicy.java`
- Test: `backend/src/test/java/com/rinana/media/security/VisibilityPolicyTest.java`

- [ ] **Step 1: Write failing visibility-policy tests**

Create `backend/src/test/java/com/rinana/media/security/VisibilityPolicyTest.java`:

```java
package com.rinana.media.security;

import com.rinana.media.common.ContentVisibility;
import com.rinana.media.common.MemberLevel;
import com.rinana.media.common.Role;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class VisibilityPolicyTest {
  @Test
  void adminRolesCanSeeEveryMembershipContent() {
    assertThat(VisibilityPolicy.canView(Role.ADMIN, MemberLevel.NORMAL, ContentVisibility.DIAMOND)).isTrue();
    assertThat(VisibilityPolicy.canView(Role.SUPER_ADMIN, MemberLevel.NORMAL, ContentVisibility.DIAMOND)).isTrue();
  }

  @Test
  void diamondCanSeeDiamondGoldNormalAndPublicContent() {
    assertThat(VisibilityPolicy.canView(Role.USER, MemberLevel.DIAMOND, ContentVisibility.DIAMOND)).isTrue();
    assertThat(VisibilityPolicy.canView(Role.USER, MemberLevel.DIAMOND, ContentVisibility.GOLD)).isTrue();
    assertThat(VisibilityPolicy.canView(Role.USER, MemberLevel.DIAMOND, ContentVisibility.NORMAL)).isTrue();
    assertThat(VisibilityPolicy.canView(Role.USER, MemberLevel.DIAMOND, ContentVisibility.PUBLIC)).isTrue();
  }

  @Test
  void normalCannotSeeGoldOrDiamondContent() {
    assertThat(VisibilityPolicy.canView(Role.USER, MemberLevel.NORMAL, ContentVisibility.GOLD)).isFalse();
    assertThat(VisibilityPolicy.canView(Role.USER, MemberLevel.NORMAL, ContentVisibility.DIAMOND)).isFalse();
  }

  @Test
  void publicContentIsAlwaysVisible() {
    assertThat(VisibilityPolicy.canView(Role.USER, MemberLevel.NORMAL, ContentVisibility.PUBLIC)).isTrue();
  }
}
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
cd backend
mvn -Dtest=VisibilityPolicyTest test
```

Expected: FAIL because enums and `VisibilityPolicy` do not exist.

- [ ] **Step 3: Add enums**

Create `backend/src/main/java/com/rinana/media/common/Role.java`:

```java
package com.rinana.media.common;

public enum Role {
  USER,
  ADMIN,
  SUPER_ADMIN
}
```

Create `backend/src/main/java/com/rinana/media/common/MemberLevel.java`:

```java
package com.rinana.media.common;

public enum MemberLevel {
  NORMAL,
  GOLD,
  DIAMOND
}
```

Create `backend/src/main/java/com/rinana/media/common/UserStatus.java`:

```java
package com.rinana.media.common;

public enum UserStatus {
  ACTIVE,
  DISABLED
}
```

Create `backend/src/main/java/com/rinana/media/common/ContentVisibility.java`:

```java
package com.rinana.media.common;

public enum ContentVisibility {
  PUBLIC,
  NORMAL,
  GOLD,
  DIAMOND
}
```

- [ ] **Step 4: Add policy implementation**

Create `backend/src/main/java/com/rinana/media/security/VisibilityPolicy.java`:

```java
package com.rinana.media.security;

import com.rinana.media.common.ContentVisibility;
import com.rinana.media.common.MemberLevel;
import com.rinana.media.common.Role;

public final class VisibilityPolicy {
  private VisibilityPolicy() {
  }

  public static boolean canView(Role role, MemberLevel memberLevel, ContentVisibility visibility) {
    if (visibility == ContentVisibility.PUBLIC) {
      return true;
    }
    if (role == Role.ADMIN || role == Role.SUPER_ADMIN) {
      return true;
    }
    return levelRank(memberLevel) >= visibilityRank(visibility);
  }

  private static int levelRank(MemberLevel level) {
    return switch (level) {
      case NORMAL -> 1;
      case GOLD -> 2;
      case DIAMOND -> 3;
    };
  }

  private static int visibilityRank(ContentVisibility visibility) {
    return switch (visibility) {
      case PUBLIC -> 0;
      case NORMAL -> 1;
      case GOLD -> 2;
      case DIAMOND -> 3;
    };
  }
}
```

- [ ] **Step 5: Run test and verify it passes**

Run:

```powershell
cd backend
mvn -Dtest=VisibilityPolicyTest test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend/src/main/java/com/rinana/media/common backend/src/main/java/com/rinana/media/security/VisibilityPolicy.java backend/src/test/java/com/rinana/media/security/VisibilityPolicyTest.java
git commit -m "feat: add membership visibility policy"
```

## Phase 2: Database Schema and User/Invite Persistence

### Task 3: Add Flyway Schema for Users, Invites, Content, Media, Audit

**Files:**
- Create: `backend/src/main/resources/db/migration/V1__initial_schema.sql`
- Create: `backend/src/test/java/com/rinana/media/schema/FlywaySchemaTest.java`

- [ ] **Step 1: Write failing schema test**

Create `backend/src/test/java/com/rinana/media/schema/FlywaySchemaTest.java`:

```java
package com.rinana.media.schema;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase
class FlywaySchemaTest {
  @Autowired
  JdbcTemplate jdbc;

  @Test
  void createsCoreTables() {
    assertThat(tableExists("users")).isTrue();
    assertThat(tableExists("invite_codes")).isTrue();
    assertThat(tableExists("media_assets")).isTrue();
    assertThat(tableExists("posts")).isTrue();
    assertThat(tableExists("albums")).isTrue();
    assertThat(tableExists("videos")).isTrue();
    assertThat(tableExists("admin_audit_logs")).isTrue();
  }

  private boolean tableExists(String tableName) {
    Integer count = jdbc.queryForObject(
      "select count(*) from information_schema.tables where table_name = ?",
      Integer.class,
      tableName
    );
    return count != null && count > 0;
  }
}
```

- [ ] **Step 2: Run schema test and verify it fails**

Run:

```powershell
cd backend
mvn -Dtest=FlywaySchemaTest test
```

Expected: FAIL because migration does not exist.

- [ ] **Step 3: Add Flyway migration**

Create `backend/src/main/resources/db/migration/V1__initial_schema.sql` with all tables from the design:

```sql
create table users (
  id uuid primary key,
  username varchar(64) not null unique,
  email varchar(255) not null unique,
  password_hash varchar(255) not null,
  display_name varchar(120) not null,
  role varchar(32) not null,
  member_level varchar(32) not null,
  status varchar(32) not null,
  avatar_url text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table invite_codes (
  id uuid primary key,
  code varchar(64) not null unique,
  initial_level varchar(32) not null,
  max_uses integer not null,
  used_count integer not null default 0,
  expires_at timestamptz,
  status varchar(32) not null,
  created_by uuid references users(id),
  created_at timestamptz not null
);

create table media_assets (
  id uuid primary key,
  media_type varchar(32) not null,
  bucket_name varchar(120) not null,
  object_key text not null,
  original_name text not null,
  mime_type varchar(160) not null,
  size_bytes bigint not null,
  width integer,
  height integer,
  duration_seconds integer,
  cover_object_key text,
  uploaded_by uuid references users(id),
  created_at timestamptz not null
);

create table posts (
  id uuid primary key,
  title varchar(240) not null,
  content text not null,
  visibility varchar(32) not null,
  status varchar(32) not null,
  is_pinned boolean not null default false,
  author_id uuid not null references users(id),
  published_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table post_media (
  id uuid primary key,
  post_id uuid not null references posts(id) on delete cascade,
  media_asset_id uuid not null references media_assets(id),
  sort_order integer not null
);

create table albums (
  id uuid primary key,
  title varchar(240) not null,
  description text not null,
  visibility varchar(32) not null,
  cover_media_id uuid references media_assets(id),
  status varchar(32) not null,
  author_id uuid not null references users(id),
  published_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table album_items (
  id uuid primary key,
  album_id uuid not null references albums(id) on delete cascade,
  media_asset_id uuid not null references media_assets(id),
  sort_order integer not null
);

create table videos (
  id uuid primary key,
  title varchar(240) not null,
  description text not null,
  visibility varchar(32) not null,
  media_asset_id uuid not null references media_assets(id),
  cover_media_id uuid references media_assets(id),
  status varchar(32) not null,
  author_id uuid not null references users(id),
  published_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table admin_audit_logs (
  id uuid primary key,
  admin_user_id uuid not null references users(id),
  action_type varchar(80) not null,
  target_type varchar(80) not null,
  target_id uuid,
  detail_json text not null,
  created_at timestamptz not null
);

create index idx_posts_feed on posts(status, visibility, published_at desc);
create index idx_albums_feed on albums(status, visibility, published_at desc);
create index idx_videos_feed on videos(status, visibility, published_at desc);
create index idx_media_uploaded_by on media_assets(uploaded_by, created_at desc);
create index idx_audit_admin_time on admin_audit_logs(admin_user_id, created_at desc);
```

- [ ] **Step 4: Add test profile config if needed**

Create `backend/src/test/resources/application-test.yml`:

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:rinana-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH
    username: sa
    password:
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true
```

- [ ] **Step 5: Run schema test and verify it passes**

Run:

```powershell
cd backend
mvn -Dtest=FlywaySchemaTest test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend/src/main/resources/db/migration/V1__initial_schema.sql backend/src/test/resources/application-test.yml backend/src/test/java/com/rinana/media/schema/FlywaySchemaTest.java
git commit -m "feat: add initial database schema"
```

## Phase 3: Auth, Invites, and Super Admin

### Task 4: Implement Super Admin Bootstrap

**Files:**
- Create: `backend/src/main/java/com/rinana/media/user/UserEntity.java`
- Create: `backend/src/main/java/com/rinana/media/user/UserRepository.java`
- Create: `backend/src/main/java/com/rinana/media/user/SuperAdminBootstrap.java`
- Test: `backend/src/test/java/com/rinana/media/user/SuperAdminBootstrapTest.java`

- [ ] **Step 1: Write failing bootstrap tests**

Create tests proving:

```java
@Test
void createsSuperAdminWhenNoneExists()
```

and:

```java
@Test
void doesNotCreateDuplicateSuperAdmin()
```

Expected assertions:

- One user exists with `role = SUPER_ADMIN`.
- Existing super admin count remains `1` after running bootstrap twice.
- Password is encoded, not stored as plain text.

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
cd backend
mvn -Dtest=SuperAdminBootstrapTest test
```

Expected: FAIL because repository and bootstrap do not exist.

- [ ] **Step 3: Implement JPA user entity/repository and bootstrap**

Implementation requirements:

- Use `PasswordEncoder`.
- Create user with `username`, `email`, `displayName` from properties.
- Set `role = SUPER_ADMIN`, `memberLevel = DIAMOND`, `status = ACTIVE`.
- Skip creation if any `SUPER_ADMIN` exists.

- [ ] **Step 4: Run test and verify it passes**

Run:

```powershell
cd backend
mvn -Dtest=SuperAdminBootstrapTest test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/main/java/com/rinana/media/user backend/src/test/java/com/rinana/media/user/SuperAdminBootstrapTest.java
git commit -m "feat: bootstrap hidden super admin"
```

### Task 5: Implement Register/Login/Me APIs

**Files:**
- Create: `backend/src/main/java/com/rinana/media/auth/AuthController.java`
- Create: `backend/src/main/java/com/rinana/media/auth/AuthService.java`
- Create: `backend/src/main/java/com/rinana/media/auth/dto/*.java`
- Create: `backend/src/main/java/com/rinana/media/security/*.java`
- Test: `backend/src/test/java/com/rinana/media/auth/AuthControllerTest.java`

- [ ] **Step 1: Write failing controller tests**

Write `MockMvc` tests for:

- `POST /api/auth/register` rejects missing/invalid invite.
- `POST /api/auth/register` creates active user with invite initial level.
- `POST /api/auth/login` accepts username or email plus password.
- `GET /api/auth/me` returns role and member level after login.
- Disabled users cannot log in.

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
cd backend
mvn -Dtest=AuthControllerTest test
```

Expected: FAIL because APIs do not exist.

- [ ] **Step 3: Implement auth**

Implementation requirements:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- Access token HttpOnly cookie.
- Refresh token HttpOnly cookie.
- Refresh token hash stored in Redis.
- Problem Details with `errorCode` for invalid credentials, invalid invite, disabled user.

- [ ] **Step 4: Run auth tests**

Run:

```powershell
cd backend
mvn -Dtest=AuthControllerTest test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/main/java/com/rinana/media/auth backend/src/main/java/com/rinana/media/security backend/src/test/java/com/rinana/media/auth/AuthControllerTest.java
git commit -m "feat: add invite-based auth APIs"
```

## Phase 4: Content, Media, and Admin APIs

### Task 6: Implement Invite Admin APIs

Implement:

- `POST /api/invites`
- `GET /api/invites`
- `DELETE /api/invites/{id}`

Test:

- Only `ADMIN` or `SUPER_ADMIN` can create/list/delete invites.
- Created invite has selected initial level.
- Used/disabled invite cannot be consumed.

Commit:

```powershell
git commit -m "feat: add invite management APIs"
```

### Task 7: Implement Content APIs and Visibility Filtering

Implement:

- `GET /api/posts`
- `POST /api/posts`
- `PUT /api/posts/{id}`
- `DELETE /api/posts/{id}`
- `GET /api/albums`
- `POST /api/albums`
- `PUT /api/albums/{id}`
- `DELETE /api/albums/{id}`
- `GET /api/videos`
- `POST /api/videos`
- `PUT /api/videos/{id}`
- `DELETE /api/videos/{id}`

Test:

- Visitors only see public content.
- Normal users do not see gold/diamond content.
- Gold users see public/normal/gold.
- Diamond users see all membership content.
- Admin and super admin can create/update/delete.

Commit:

```powershell
git commit -m "feat: add content APIs with membership visibility"
```

### Task 8: Implement MinIO Media APIs

Implement:

- `POST /api/media/images`
- `POST /api/media/videos`
- `GET /api/media/{id}/access`

Test:

- Only `ADMIN` or `SUPER_ADMIN` can upload.
- Video upload rejects non-video MIME types.
- Media access checks linked content visibility before returning a presigned URL.
- Response includes short-lived URL and expiration timestamp.

Commit:

```powershell
git commit -m "feat: add MinIO media APIs"
```

## Phase 5: Frontend API Migration

### Task 9: Add Java API Client

**Files:**
- Create: `src/services/java-api-client.ts`
- Test: `src/services/java-api-client.test.ts`

Implement client methods:

- `login`
- `register`
- `logout`
- `getMe`
- `listContent`
- `createInvite`
- `deleteInvite`
- `updateUser`
- `uploadImage`
- `uploadVideo`
- `createPost`
- `createAlbum`
- `createVideo`

Test:

- Uses same-origin `/api/*` endpoints.
- Sends credentials with `credentials: "include"`.
- Parses Problem Details errors into user-facing errors.

Run:

```powershell
$env:PATH='C:\Users\Yao\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:PATH
& 'C:\Users\Yao\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\Yao\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs' test
```

Commit:

```powershell
git commit -m "feat: add Spring Boot API client"
```

### Task 10: Replace Supabase/R2 Frontend Runtime

Modify:

- `src/state/AppStateProvider.tsx`
- `src/services/content-client.ts`
- `src/services/admin-upload-client.ts`
- `src/components/LoginView.tsx`
- `src/components/AdminPanel.tsx`

Requirements:

- Login/register uses Java backend.
- Current user comes from `/api/auth/me`.
- Admin actions use Java backend APIs.
- Uploads use `/api/media/images` and `/api/media/videos`.
- Remove runtime dependency on Supabase and Cloudflare R2 for production behavior.

Tests:

- Existing component tests updated to expect Java API calls.
- Admin entry displays only for admin/super admin returned by `/api/auth/me`.

Commit:

```powershell
git commit -m "feat: switch frontend to Spring Boot API"
```

## Phase 6: Docker Compose and Nginx

### Task 11: Add Dockerfiles and Compose

Create:

- `Dockerfile.frontend`
- `backend/Dockerfile`
- `deploy/docker-compose.yml`
- `deploy/nginx/site.conf`
- `deploy/env/backend.env.example`
- `deploy/env/postgres.env.example`
- `deploy/env/minio.env.example`

Compose services:

- `nginx`
- `frontend`
- `backend`
- `postgres`
- `redis`
- `minio`

Nginx routes:

- `/` to `frontend:3000`
- `/api/` to `backend:8080`

Set:

- `client_max_body_size 512m`
- JVM `JAVA_TOOL_OPTIONS=-Xms256m -Xmx768m`

Local verification if Docker is available:

```powershell
docker compose -f deploy/docker-compose.yml up --build
```

If Docker is unavailable, verify YAML structure by review and run full compose on the server.

Commit:

```powershell
git commit -m "feat: add Docker Compose deployment"
```

## Phase 7: End-to-End Verification

### Task 12: Verify Full Product Flow

Required checks:

- Backend tests: `cd backend && mvn test`
- Frontend tests: `pnpm test`
- Frontend build: `pnpm build`
- Docker deployment: `docker compose -f deploy/docker-compose.yml up --build`
- Visit `/zh`
- Login with super admin
- Generate invite
- Register a normal user with invite
- Promote user to gold/diamond
- Publish post, album, and video
- Upload image and video
- Confirm public/normal/gold/diamond visibility behavior
- Confirm super admin is not visible on public pages

Commit final docs update:

```powershell
git add README.md docs/production-setup.md docs/deploy-checklist.md
git commit -m "docs: document self-hosted Java deployment"
```

## Self-Review

Spec coverage:

- Next.js frontend retained: Phase 5.
- Spring Boot backend: Phases 1-4.
- PostgreSQL schema: Phase 2.
- Redis refresh token storage: Phase 3.
- MinIO storage: Phase 4.
- Nginx and Docker Compose: Phase 6.
- Invite registration: Phase 3 and Phase 4.
- Roles `USER`, `ADMIN`, `SUPER_ADMIN`: Phases 1-4.
- Membership visibility: Phase 1 and Phase 4.
- Media upload/access: Phase 4.
- Frontend runtime migration: Phase 5.
- Verification: Phase 7.

Known environment constraint:

- Docker is not available on this Windows machine at plan-writing time, so container verification must run after Docker is installed or on the target server.
