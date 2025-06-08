// js/firebase-config.js

/**
 * Módulo de Configuração do Firebase
 * * Este ficheiro centraliza a inicialização do Firebase e exporta as instâncias
 * e funções necessárias para o resto da aplicação.
 * Isto evita a repetição da configuração em múltiplos ficheiros.
 */

// Importações do Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    getDocs, 
    query, 
    limit,
    onSnapshot, 
    Timestamp,
    writeBatch,
    deleteDoc, 
    setDoc,
    updateDoc, 
    where 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// A sua configuração do Firebase
const firebaseConfig = {
     apiKey: "AIzaSyDOg6A8HFA_JCP_4iS7JcRCTRgdnzcP4Xk",
     authDomain: "sistema-grafica-pro.firebaseapp.com",
     projectId: "sistema-grafica-pro",
     storageBucket: "sistema-grafica-pro.firebasestorage.app",
     messagingSenderId: "1043193530848",
     appId: "1:1043193530848:web:b0effc9640a2e8ed6f8385"
};

// Inicialização dos serviços do Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ID da instância da aplicação (para ambientes multi-tenant, se aplicável)
const shopInstanceAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Exporta as instâncias e funções para serem usadas noutros módulos
export {
    auth,
    db,
    shopInstanceAppId,
    // Funções de Autenticação
    signInAnonymously,
    onAuthStateChanged,
    // Funções do Firestore
    collection,
    addDoc,
    doc,
    getDocs,
    query,
    limit,
    onSnapshot,
    Timestamp,
    writeBatch,
    deleteDoc,
    setDoc,
    updateDoc,
    where
};
