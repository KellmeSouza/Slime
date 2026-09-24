# Slimo Desktop – tutor de inglês

Slime transparente, sempre no topo, que ouve português/inglês, corrige sua fala, fala com voz masculina (lip-sync real), anda pela tela, vê sua tela e lembra da última conversa.

## Instalar (precisa do Node.js 18+)
1. `npm install`
2. Crie uma chave **grátis, sem cartão** em https://console.groq.com/keys
3. Copie `.env.example` para `.env` e cole a chave em `GROQ_API_KEY`
4. `npm start`

## Uso
- Fale normalmente (Whisper detecta PT/EN sozinho). Digite nada: é tudo por voz.
- "Slime, o que estou fazendo?" / "traduza o que está escrito no meio da tela" → ele tira um print da tela e analisa.
- **"Desligar sistema"** → despede-se e dorme. **"Ligar sistema"** → volta de onde parou ("Paramos na conversa sobre …").
- "Fechar aplicativo" → fecha o programa.
- Arraste o slime com o mouse para onde quiser.
- Histórico salvo em `state.json` (pasta de dados do app).

## Como é grátis
- **Groq** (gratuito, com limites de uso por minuto/dia): transcrição Whisper, chat (Qwen 3.6 27B) e visão (Qwen 3.6 27B (multimodal)) para os prints da tela.
- **Edge-TTS** (sem chave): vozes masculinas `en-US-GuyNeural` e `pt-BR-AntonioNeural`. É um serviço não oficial da Microsoft; se falhar, o Slimo usa a voz do seu sistema.
- Se aparecer erro de limite (429), espere um pouco. Os nomes de modelos do Groq mudam de tempos em tempos: ajuste no `.env`.

## Permissões
- macOS: permita Microfone e Gravação de Tela em Ajustes > Privacidade.
- Linux: precisa de um compositor para a janela transparente.
- Se ele ouvir ruído demais/de menos, ajuste `TH` em `index.html`.
