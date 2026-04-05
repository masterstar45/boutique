import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Composant Home simple qui fonctionne
function SimpleHome() {
  return (
    <div style={{
      padding: '20px',
      fontFamily: 'DM Sans, sans-serif',
      background: '#0a0a0a',
      color: '#ffffff',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#3b82f6', fontSize: '2rem', marginBottom: '20px' }}>
        BANK$DATA Boutique
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
        Bienvenue dans la boutique !
      </p>
      <div style={{
        background: '#1a1a1a',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #374151',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#ffffff', marginBottom: '10px' }}>Menu:</h2>
        <ul style={{ color: '#9ca3af', lineHeight: '1.6' }}>
          <li>🏠 Accueil</li>
          <li>🛍️ Boutique</li>
          <li>🛒 Panier</li>
          <li>👤 Profil</li>
          <li>📞 Contact</li>
        </ul>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button style={{
          background: '#3b82f6',
          color: '#ffffff',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          cursor: 'pointer'
        }}>
          Accéder à la boutique
        </button>
        <button style={{
          background: '#1f2937',
          color: '#ffffff',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          cursor: 'pointer'
        }}>
          Voir le panier
        </button>
      </div>
    </div>
  );
}

function SimpleCart() {
  return (
    <div style={{
      padding: '20px',
      fontFamily: 'DM Sans, sans-serif',
      background: '#0a0a0a',
      color: '#ffffff',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#3b82f6', fontSize: '2rem', marginBottom: '20px' }}>
        Panier
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
        Votre panier est vide
      </p>
      <button style={{
        background: '#3b82f6',
        color: '#ffffff',
        padding: '12px 24px',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        cursor: 'pointer'
      }}>
        Retour à la boutique
      </button>
    </div>
  );
}

function SimpleProfile() {
  return (
    <div style={{
      padding: '20px',
      fontFamily: 'DM Sans, sans-serif',
      background: '#0a0a0a',
      color: '#ffffff',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#3b82f6', fontSize: '2rem', marginBottom: '20px' }}>
        Profil
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
        Profil utilisateur
      </p>
      <button style={{
        background: '#3b82f6',
        color: '#ffffff',
        padding: '12px 24px',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        cursor: 'pointer'
      }}>
        Retour à l'accueil
      </button>
    </div>
  );
}

function SimpleContact() {
  return (
    <div style={{
      padding: '20px',
      fontFamily: 'DM Sans, sans-serif',
      background: '#0a0a0a',
      color: '#ffffff',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#3b82f6', fontSize: '2rem', marginBottom: '20px' }}>
        Contact
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
        Page de contact
      </p>
      <button style={{
        background: '#3b82f6',
        color: '#ffffff',
        padding: '12px 24px',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        cursor: 'pointer'
      }}>
        Retour à l'accueil
      </button>
    </div>
  );
}

function AppContent() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <Switch>
        {/* Routes Mini App */}
        <Route path="/" component={SimpleHome} />
        <Route path="/panier" component={SimpleCart} />
        <Route path="/profil" component={SimpleProfile} />
        <Route path="/contact" component={SimpleContact} />
        
        {/* Routes Admin */}
        <Route path="/admin" component={SimpleHome} />
        
        {/* Fallback */}
        <Route path="/:rest*" component={SimpleHome} />
      </Switch>
    </div>
  );
}

function App() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter>
        <AppContent />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
