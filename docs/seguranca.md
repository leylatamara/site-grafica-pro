# Segurança - Sistema de Gestão para Gráficas

## Índice
1. [Visão Geral](#visão-geral)
2. [Autenticação](#autenticação)
3. [Autorização](#autorização)
4. [Dados](#dados)
5. [Comunicação](#comunicação)
6. [Monitoramento](#monitoramento)
7. [Recomendações](#recomendações)

## Visão Geral

O Sistema de Gestão para Gráficas implementa medidas de segurança em diferentes camadas.

### Princípios

1. **Confidencialidade**
   - Dados sensíveis criptografados
   - Acesso controlado
   - Proteção contra vazamentos

2. **Integridade**
   - Validação de dados
   - Controle de versão
   - Backup e recuperação

3. **Disponibilidade**
   - Alta disponibilidade
   - Recuperação de desastres
   - Monitoramento contínuo

## Autenticação

### 1. Firebase Auth

```javascript
// security/auth/firebase.js
import { getAuth } from 'firebase-admin/auth';

export async function createUser(data) {
  try {
    const user = await getAuth().createUser({
      email: data.email,
      password: data.password,
      displayName: data.name,
      emailVerified: false,
      disabled: false
    });
    
    await getAuth().setCustomUserClaims(user.uid, {
      role: data.role,
      permissions: data.permissions
    });
    
    return user;
  } catch (error) {
    throw new Error('Erro ao criar usuário');
  }
}

export async function verifyToken(token) {
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    throw new Error('Token inválido');
  }
}

export async function updateUser(uid, data) {
  try {
    await getAuth().updateUser(uid, {
      email: data.email,
      displayName: data.name,
      disabled: data.disabled
    });
    
    if (data.role || data.permissions) {
      await getAuth().setCustomUserClaims(uid, {
        role: data.role,
        permissions: data.permissions
      });
    }
    
    return true;
  } catch (error) {
    throw new Error('Erro ao atualizar usuário');
  }
}
```

### 2. Tokens

```javascript
// security/auth/tokens.js
import { getAuth } from 'firebase-admin/auth';

export async function createSessionToken(uid) {
  try {
    const token = await getAuth().createSessionCookie(uid, {
      expiresIn: 60 * 60 * 24 * 5 // 5 dias
    });
    
    return token;
  } catch (error) {
    throw new Error('Erro ao criar token de sessão');
  }
}

export async function verifySessionToken(token) {
  try {
    const decodedToken = await getAuth().verifySessionCookie(token);
    return decodedToken;
  } catch (error) {
    throw new Error('Token de sessão inválido');
  }
}

export async function revokeSessionToken(token) {
  try {
    await getAuth().revokeSessionCookie(token);
    return true;
  } catch (error) {
    throw new Error('Erro ao revogar token de sessão');
  }
}
```

### 3. Sessão

```javascript
// security/auth/session.js
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function createSession(userId, data) {
  try {
    const session = {
      userId,
      ...data,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5) // 5 dias
    };
    
    const docRef = await db.collection('sessions').add(session);
    return { id: docRef.id, ...session };
  } catch (error) {
    throw new Error('Erro ao criar sessão');
  }
}

export async function getSession(sessionId) {
  try {
    const session = await db.collection('sessions').doc(sessionId).get();
    
    if (!session.exists) {
      throw new Error('Sessão não encontrada');
    }
    
    return { id: session.id, ...session.data() };
  } catch (error) {
    throw new Error('Erro ao buscar sessão');
  }
}

export async function deleteSession(sessionId) {
  try {
    await db.collection('sessions').doc(sessionId).delete();
    return true;
  } catch (error) {
    throw new Error('Erro ao deletar sessão');
  }
}
```

## Autorização

### 1. Roles

```javascript
// security/auth/roles.js
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function createRole(data) {
  try {
    const role = {
      name: data.name,
      permissions: data.permissions,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('roles').add(role);
    return { id: docRef.id, ...role };
  } catch (error) {
    throw new Error('Erro ao criar role');
  }
}

export async function getRole(roleId) {
  try {
    const role = await db.collection('roles').doc(roleId).get();
    
    if (!role.exists) {
      throw new Error('Role não encontrada');
    }
    
    return { id: role.id, ...role.data() };
  } catch (error) {
    throw new Error('Erro ao buscar role');
  }
}

export async function updateRole(roleId, data) {
  try {
    await db.collection('roles').doc(roleId).update({
      ...data,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    throw new Error('Erro ao atualizar role');
  }
}
```

### 2. Middleware

```javascript
// security/middleware/auth.js
import { getAuth } from 'firebase-admin/auth';

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    const token = authHeader.split(' ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
}

export async function roleMiddleware(roles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autenticado' });
      }
      
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Não autorizado' });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  };
}

export async function permissionMiddleware(permissions) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autenticado' });
      }
      
      const hasPermission = permissions.every(permission =>
        req.user.permissions.includes(permission)
      );
      
      if (!hasPermission) {
        return res.status(403).json({ error: 'Não autorizado' });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  };
}
```

### 3. Guards

```javascript
// security/guards/resource.js
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function resourceGuard(resourceType) {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const resource = await db.collection(resourceType).doc(id).get();
      
      if (!resource.exists) {
        return res.status(404).json({ error: 'Recurso não encontrado' });
      }
      
      const resourceData = resource.data();
      
      // Verifica propriedade
      if (resourceData.userId !== req.user.uid) {
        return res.status(403).json({ error: 'Não autorizado' });
      }
      
      req.resource = { id: resource.id, ...resourceData };
      next();
    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  };
}

export async function ownershipGuard(resourceType, field = 'userId') {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const resource = await db.collection(resourceType).doc(id).get();
      
      if (!resource.exists) {
        return res.status(404).json({ error: 'Recurso não encontrado' });
      }
      
      const resourceData = resource.data();
      
      // Verifica propriedade
      if (resourceData[field] !== req.user.uid) {
        return res.status(403).json({ error: 'Não autorizado' });
      }
      
      req.resource = { id: resource.id, ...resourceData };
      next();
    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  };
}
```

## Dados

### 1. Criptografia

```javascript
// security/data/encryption.js
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);

export function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

export function decrypt(encrypted, iv, authTag) {
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### 2. Sanitização

```javascript
// security/data/sanitization.js
import { sanitize } from 'class-sanitizer';
import { plainToClass } from 'class-transformer';

export function sanitizeData(data, schema) {
  try {
    const instance = plainToClass(schema, data);
    return sanitize(instance);
  } catch (error) {
    throw new Error('Erro ao sanitizar dados');
  }
}

export function sanitizeQuery(query) {
  try {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        sanitized[key] = value.trim();
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  } catch (error) {
    throw new Error('Erro ao sanitizar query');
  }
}

export function sanitizePath(path) {
  try {
    return path.replace(/[^a-zA-Z0-9-_/]/g, '');
  } catch (error) {
    throw new Error('Erro ao sanitizar path');
  }
}
```

### 3. Validação

```javascript
// security/data/validation.js
import Joi from 'joi';

export function validateData(data, schema) {
  try {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      throw new Error(error.details.map(detail => detail.message).join(', '));
    }
    
    return value;
  } catch (error) {
    throw new Error('Erro ao validar dados');
  }
}

export function validateQuery(query, schema) {
  try {
    const { error, value } = schema.validate(query, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      throw new Error(error.details.map(detail => detail.message).join(', '));
    }
    
    return value;
  } catch (error) {
    throw new Error('Erro ao validar query');
  }
}

export function validatePath(path, schema) {
  try {
    const { error, value } = schema.validate(path, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      throw new Error(error.details.map(detail => detail.message).join(', '));
    }
    
    return value;
  } catch (error) {
    throw new Error('Erro ao validar path');
  }
}
```

## Comunicação

### 1. HTTPS

```javascript
// security/communication/https.js
import express from 'express';
import helmet from 'helmet';

const app = express();

// Configurações de segurança
app.use(helmet());

// Headers de segurança
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Redirecionamento HTTP para HTTPS
app.use((req, res, next) => {
  if (req.secure) {
    next();
  } else {
    res.redirect(`https://${req.headers.host}${req.url}`);
  }
});
```

### 2. CORS

```javascript
// security/communication/cors.js
import cors from 'cors';

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400 // 24 horas
};

export const corsMiddleware = cors(corsOptions);
```

### 3. Rate Limiting

```javascript
// security/communication/rate-limit.js
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  message: 'Muitas requisições deste IP, tente novamente mais tarde',
  standardHeaders: true,
  legacyHeaders: false
});

export const rateLimitMiddleware = limiter;
```

## Monitoramento

### 1. Logs

```javascript
// security/monitoring/logs.js
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function logSecurityEvent(event) {
  try {
    await db.collection('security_logs').add({
      ...event,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Erro ao salvar log de segurança:', error);
  }
}

export async function logAccessAttempt(attempt) {
  try {
    await db.collection('access_logs').add({
      ...attempt,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Erro ao salvar log de acesso:', error);
  }
}

export async function logDataAccess(access) {
  try {
    await db.collection('data_logs').add({
      ...access,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Erro ao salvar log de dados:', error);
  }
}
```

### 2. Alertas

```javascript
// security/monitoring/alerts.js
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function createAlert(alert) {
  try {
    await db.collection('security_alerts').add({
      ...alert,
      status: 'active',
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Erro ao criar alerta:', error);
  }
}

export async function updateAlert(alertId, data) {
  try {
    await db.collection('security_alerts').doc(alertId).update({
      ...data,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Erro ao atualizar alerta:', error);
  }
}

export async function resolveAlert(alertId) {
  try {
    await db.collection('security_alerts').doc(alertId).update({
      status: 'resolved',
      resolvedAt: new Date()
    });
  } catch (error) {
    console.error('Erro ao resolver alerta:', error);
  }
}
```

### 3. Relatórios

```javascript
// security/monitoring/reports.js
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function generateSecurityReport(startDate, endDate) {
  try {
    // Coletar dados
    const logs = await db.collection('security_logs')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();
      
    const alerts = await db.collection('security_alerts')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .get();
      
    // Processar dados
    const report = {
      period: {
        start: startDate,
        end: endDate
      },
      events: {
        total: logs.docs.length,
        byType: {}
      },
      alerts: {
        total: alerts.docs.length,
        active: alerts.docs.filter(doc => doc.data().status === 'active').length,
        resolved: alerts.docs.filter(doc => doc.data().status === 'resolved').length
      }
    };
    
    // Agrupar eventos por tipo
    logs.docs.forEach(doc => {
      const { type } = doc.data();
      report.events.byType[type] = (report.events.byType[type] || 0) + 1;
    });
    
    // Salvar relatório
    await db.collection('security_reports').add({
      ...report,
      generatedAt: new Date()
    });
    
    return report;
  } catch (error) {
    console.error('Erro ao gerar relatório de segurança:', error);
    throw error;
  }
}
```

## Recomendações

### 1. Autenticação
- Use senhas fortes
- Implemente 2FA
- Gerencie sessões
- Monitore acessos

### 2. Dados
- Criptografe dados sensíveis
- Valide entradas
- Sanitize saídas
- Faça backup

### 3. Infraestrutura
- Use HTTPS
- Configure CORS
- Implemente rate limiting
- Monitore logs 