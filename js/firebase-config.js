// js/firebase-config.js

/**
 * Módulo de Configuração do Firebase
 * Centraliza a inicialização e exporta as instâncias e funções.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDocs, query, limit, onSnapshot, Timestamp, writeBatch, deleteDoc, setDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
     apiKey: "AIzaSyDOg6A8HFA_JCP_4iS7JcRCTRgdnzcP4Xk",
     authDomain: "sistema-grafica-pro.firebaseapp.com",
     projectId: "sistema-grafica-pro",
     storageBucket: "sistema-grafica-pro.firebasestorage.app",
     messagingSenderId: "1043193530848",
     appId: "1:1043193530848:web:b0effc9640a2e8ed6f8385"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// **CORREÇÃO: Simplificação do caminho da base de dados**
// Todas as coleções estarão dentro de 'grafica-pro-data' para garantir consistência.
const basePath = `artifacts/grafica-pro-data`;

export {
    auth,
    db,
    basePath, // Exporta o caminho base
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
