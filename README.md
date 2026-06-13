# 🎫 Logistics Tool - Ticket Generator

Sistema web para geração e gerenciamento de tickets logísticos com integração ao Google Sheets.

O projeto foi criado para automatizar processos operacionais de atendimento logístico, reduzindo o tempo gasto na criação manual de mensagens para clientes e entregadores.

---

## 🚀 Funcionalidades

✅ Extração automática de dados a partir de texto copiado do sistema

✅ Geração automática de mensagens para:
- Cliente
- Entregador

✅ Integração com Google Sheets via Apps Script

✅ Histórico temporário de tickets gerados

✅ Controle de Status/Ação dos tickets

✅ Dashboard com resumo de reclamações

✅ Interface responsiva e moderna

✅ Armazenamento local de configurações

---

## 📸 Demonstração

### Gerador de Tickets

![Gerador](images/Gerador.png)

---

### Configurações

![Configurações](images/Configurações.png)

---

### Instruções de Integração

![Instruções](images/Instruções.png)

---

### Dashboard da Planilha

![Resumo](images/Resumo%20planilha.png)

---

### Controle de Tickets

![Tickets](images/Tickets%20planilha.png)

---

## 🏗️ Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla JS)
- Bootstrap 5
- Google Apps Script
- Google Sheets

---

## 📂 Estrutura do Projeto

```txt
Logistics-Tool-Ticket-Generator/
│
├── index.html
├── apps-script-generico.gs
│
├── css/
│   └── styles.css
│
├── js/
│   └── app.js
│
├── images/
│   ├── Gerador.png
│   ├── Configurações.png
│   ├── Instruções.png
│   ├── Resumo planilha.png
│   └── Tickets planilha.png
│
└── README.md
```

---

## ⚙️ Como Executar

### 1. Clone o projeto

```bash
git clone https://github.com/Rilobaron/Logistics-Tool-Ticket-Generator.git
```

### 2. Abra o projeto

Basta abrir o arquivo:
# 🎫 Logistics Tool - Ticket Generator

Sistema web para geração e gerenciamento de tickets logísticos com integração ao Google Sheets.

O projeto foi criado para automatizar processos operacionais de atendimento logístico, reduzindo o tempo gasto na criação manual de mensagens para clientes e entregadores.

---

## 🚀 Funcionalidades

✅ Extração automática de dados a partir de texto copiado do sistema

✅ Geração automática de mensagens para:
- Cliente
- Entregador

✅ Integração com Google Sheets via Apps Script

✅ Histórico temporário de tickets gerados

✅ Controle de Status/Ação dos tickets

✅ Dashboard com resumo de reclamações

✅ Interface responsiva e moderna

✅ Armazenamento local de configurações

---

## 📸 Demonstração

### Gerador de Tickets

![Gerador](images/Gerador.png)

---

### Configurações

![Configurações](images/Configurações.png)

---

### Instruções de Integração

![Instruções](images/Instruções.png)

---

### Dashboard da Planilha

![Resumo](images/Resumo%20planilha.png)

---

### Controle de Tickets

![Tickets](images/Tickets%20planilha.png)

---

## 🏗️ Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla JS)
- Bootstrap 5
- Google Apps Script
- Google Sheets

---

## 📂 Estrutura do Projeto

```txt
Logistics-Tool-Ticket-Generator/
│
├── index.html
├── apps-script-generico.gs
│
├── css/
│   └── styles.css
│
├── js/
│   └── app.js
│
├── images/
│   ├── Gerador.png
│   ├── Configurações.png
│   ├── Instruções.png
│   ├── Resumo planilha.png
│   └── Tickets planilha.png
│
└── README.md
```

---

## ⚙️ Como Executar

### 1. Clone o projeto

```bash
git clone https://github.com/Rilobaron/Logistics-Tool-Ticket-Generator.git
```

### 2. Abra o projeto

Basta abrir o arquivo:

```txt
index.html
```

em qualquer navegador moderno.

---

## 🔗 Configuração do Google Sheets

### 1. Criar planilha

Crie uma nova planilha no Google Sheets.

### 2. Abrir Apps Script

```txt
Extensões → Apps Script
```

### 3. Colar o código

Copie o conteúdo do arquivo:

```txt
apps-script-generico.gs
```

### 4. Publicar

```txt
Implantar → Nova implantação
```

Selecione:

```txt
Aplicativo da Web
```

### 5. Copiar URL

Copie a URL gerada terminada em:

```txt
/exec
```

### 6. Configurar no sistema

Abra:

```txt
Configurações → URL do Apps Script
```

Cole a URL e salve.

---

## 🔒 Privacidade

O sistema não possui backend próprio.

Os dados são armazenados da seguinte forma:

- sessionStorage → histórico temporário
- localStorage → preferências do usuário
- Google Sheets → registros dos tickets

Nenhuma informação é enviada para servidores externos.

---

## 🎯 Objetivo

Este projeto foi desenvolvido para automatizar o processo de abertura e acompanhamento de tickets logísticos, eliminando tarefas repetitivas e melhorando a produtividade operacional.

---

## 👨‍💻 Autor

**Murilo Baron**

GitHub:
https://github.com/Rilobaron

LinkedIn:
https://linkedin.com/in/murilo-baron-pereira
```txt
index.html
```

em qualquer navegador moderno.

---

## 🔗 Configuração do Google Sheets

### 1. Criar planilha

Crie uma nova planilha no Google Sheets.

### 2. Abrir Apps Script

```txt
Extensões → Apps Script
```

### 3. Colar o código

Copie o conteúdo do arquivo:

```txt
apps-script-generico.gs
```

### 4. Publicar

```txt
Implantar → Nova implantação
```

Selecione:

```txt
Aplicativo da Web
```

### 5. Copiar URL

Copie a URL gerada terminada em:

```txt
/exec
```

### 6. Configurar no sistema

Abra:

```txt
Configurações → URL do Apps Script
```

Cole a URL e salve.

---

## 🔒 Privacidade

O sistema não possui backend próprio.

Os dados são armazenados da seguinte forma:

- sessionStorage → histórico temporário
- localStorage → preferências do usuário
- Google Sheets → registros dos tickets

Nenhuma informação é enviada para servidores externos.

---

## 🎯 Objetivo

Este projeto foi desenvolvido para automatizar o processo de abertura e acompanhamento de tickets logísticos, eliminando tarefas repetitivas e melhorando a produtividade operacional.

---

## 👨‍💻 Autor

**Murilo Baron**

GitHub:
https://github.com/Rilobaron

LinkedIn:
https://linkedin.com/in/murilo-baron-pereira