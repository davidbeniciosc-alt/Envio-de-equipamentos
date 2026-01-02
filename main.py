from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from contextlib import asynccontextmanager
import sqlite3
import os
import uvicorn
from datetime import datetime
import re

# Lifespan moderno
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    yield
    # Shutdown
    pass

app = FastAPI(
    title="Sistema de Equipamentos NSO",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurações
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "equipamentos.db")

print("📁 Diretório do projeto:", BASE_DIR)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS equipamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projeto TEXT NOT NULL,
            fornecedor TEXT NOT NULL,
            modelo TEXT NOT NULL,
            numero_serie TEXT NOT NULL,
            defeito TEXT NOT NULL,
            data_envio TEXT NOT NULL,
            data_retorno TEXT,
            empresa TEXT NOT NULL,
            filial TEXT NOT NULL,
            retornou BOOLEAN DEFAULT 0,
            tem_arquivo BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Inserir dados de exemplo se a tabela estiver vazia
    count = conn.execute("SELECT COUNT(*) FROM equipamentos").fetchone()[0]
    if count == 0:
        dados_exemplo = [
            ("Intermunicipal", "Autopass", "K4", "00187", "Falhando ao digitar", 
             "2025-06-17", "2025-07-25", "AVUL", "Osasco", 1, 1),
            ("Intermunicipal", "Autopass", "K4", "s/n", "Tecla 2 com mau contato", 
             "2025-06-17", None, "AVUL", "Osasco", 0, 0),
            ("Municipal", "Prodata", "V3680", "3372", "desligando ao encostar cartão", 
             "2025-06-18", "2025-06-27", "VSBL", "Jaguara", 1, 1),
        ]
        
        for dado in dados_exemplo:
            conn.execute("""
                INSERT INTO equipamentos 
                (projeto, fornecedor, modelo, numero_serie, defeito, data_envio, 
                 data_retorno, empresa, filial, retornou, tem_arquivo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, dado)
        
        conn.commit()
        print(f"✅ {len(dados_exemplo)} registros de exemplo inseridos")
    
    conn.close()
    print("✅ Banco inicializado")

def validar_numero_serie(numero_serie):
    """Valida e formata o número de série"""
    if not numero_serie or numero_serie.strip() == "":
        return "SN NÃO INFORMADO"
    
    numero_serie = numero_serie.strip().upper()
    
    # Se for apenas "SN" ou começar com "SN" mas sem número
    if numero_serie == "SN" or numero_serie == "S/N" or numero_serie == "N/A":
        return "SN NÃO INFORMADO"
    
    # Se começar com SN mas tem número depois, mantém
    if numero_serie.startswith("SN") and len(numero_serie) > 2:
        return numero_serie
    
    # Se for um número válido, mantém
    if re.match(r'^[A-Z0-9\-_]+$', numero_serie):
        return numero_serie
    
    # Para qualquer outro caso, considera como não informado
    return "SN NÃO INFORMADO"

# ========================= FRONTEND ===========================

# Servir arquivos estáticos da mesma pasta
app.mount("/static", StaticFiles(directory=BASE_DIR), name="static")

@app.get("/")
async def serve_frontend():
    """Serve o frontend (index.html)"""
    index_path = os.path.join(BASE_DIR, "index.html")
    if os.path.exists(index_path):
        print(f"✅ Servindo index.html de: {index_path}")
        return FileResponse(index_path)
    else:
        print(f"❌ index.html não encontrado em: {index_path}")
        return HTMLResponse("""
        <html>
            <head><title>Sistema NSO</title></head>
            <body>
                <h1>🚀 Sistema de Equipamentos NSO</h1>
                <p>Frontend não encontrado.</p>
            </body>
        </html>
        """)

@app.get("/{filename}")
async def serve_file(filename: str):
    """Serve arquivos específicos (CSS, JS)"""
    file_path = os.path.join(BASE_DIR, filename)
    
    allowed_extensions = ['.html', '.css', '.js', '.ico', '.png', '.jpg', '.jpeg']
    file_ext = os.path.splitext(filename)[1].lower()
    
    if os.path.exists(file_path) and file_ext in allowed_extensions:
        return FileResponse(file_path)
    else:
        return await serve_frontend()

# ========================= API ENDPOINTS =========================

@app.get("/api/health")
async def health_check():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM equipamentos").fetchone()[0]
    conn.close()
    return {
        "status": "online",
        "total_equipamentos": total,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/equipamentos")
async def listar_equipamentos(
    empresa: str = None,
    fornecedor: str = None,
    projeto: str = None,
    retornou: bool = None
):
    """Endpoint principal para o Power BI"""
    conn = get_db()
    
    query = "SELECT * FROM equipamentos WHERE 1=1"
    params = []
    
    if empresa:
        query += " AND empresa=?"
        params.append(empresa.upper())
    if fornecedor:
        query += " AND fornecedor=?"
        params.append(fornecedor)
    if projeto:
        query += " AND projeto=?"
        params.append(projeto)
    if retornou is not None:
        query += " AND retornou=?"
        params.append(1 if retornou else 0)
    
    query += " ORDER BY id DESC"
    
    rows = conn.execute(query, params).fetchall()
    conn.close()
    
    equipamentos = []
    for row in rows:
        equipamento = dict(row)
        equipamento['empresa'] = equipamento['empresa'].upper()
        equipamento['retornou'] = bool(equipamento['retornou'])
        equipamento['tem_arquivo'] = bool(equipamento['tem_arquivo'])
        
        # Validar e formatar número de série para o Power BI
        equipamento['numero_serie'] = validar_numero_serie(equipamento['numero_serie'])
        
        equipamentos.append(equipamento)
    
    return equipamentos

@app.get("/api/equipamentos/{equipamento_id}")
async def obter_equipamento(equipamento_id: int):
    """Obter um equipamento específico por ID"""
    conn = get_db()
    
    equipamento = conn.execute(
        "SELECT * FROM equipamentos WHERE id = ?", 
        (equipamento_id,)
    ).fetchone()
    
    conn.close()
    
    if not equipamento:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    
    equipamento_dict = dict(equipamento)
    equipamento_dict['empresa'] = equipamento_dict['empresa'].upper()
    equipamento_dict['retornou'] = bool(equipamento_dict['retornou'])
    equipamento_dict['tem_arquivo'] = bool(equipamento_dict['tem_arquivo'])
    
    return equipamento_dict

@app.post("/api/equipamentos")
async def criar_equipamento(equip: dict):
    """Cadastrar novo equipamento"""
    required_fields = ["projeto", "fornecedor", "modelo", "numero_serie", "defeito", "empresa", "filial", "data_envio"]
    
    for field in required_fields:
        if not equip.get(field):
            raise HTTPException(status_code=400, detail=f"Campo obrigatório: {field}")
    
    # Garantir formato consistente
    equip['empresa'] = equip['empresa'].upper()
    
    # Validar e formatar número de série
    equip['numero_serie'] = validar_numero_serie(equip['numero_serie'])
    
    conn = get_db()
    cursor = conn.execute("""
        INSERT INTO equipamentos 
        (projeto, fornecedor, modelo, numero_serie, defeito, data_envio, 
         data_retorno, empresa, filial, retornou, tem_arquivo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        equip["projeto"], equip["fornecedor"], equip["modelo"],
        equip["numero_serie"], equip["defeito"], equip["data_envio"],
        equip.get("data_retorno"), equip["empresa"], equip["filial"],
        equip.get("retornou", False), equip.get("tem_arquivo", False)
    ))
    conn.commit()
    equip_id = cursor.lastrowid
    conn.close()
    
    return {
        "message": "Equipamento cadastrado com sucesso", 
        "id": equip_id,
        "empresa": equip['empresa']
    }

@app.put("/api/equipamentos/{equipamento_id}")
async def atualizar_equipamento(equipamento_id: int, equip: dict):
    """Atualizar equipamento existente"""
    conn = get_db()
    
    # Verificar se o equipamento existe
    existing = conn.execute("SELECT * FROM equipamentos WHERE id = ?", (equipamento_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    
    # Obter dados atuais
    current_data = dict(existing)
    
    # Atualizar apenas os campos fornecidos, mantendo os existentes para os não fornecidos
    updated_data = {
        "projeto": equip.get("projeto", current_data["projeto"]),
        "fornecedor": equip.get("fornecedor", current_data["fornecedor"]),
        "modelo": equip.get("modelo", current_data["modelo"]),
        "numero_serie": validar_numero_serie(equip.get("numero_serie", current_data["numero_serie"])),
        "defeito": equip.get("defeito", current_data["defeito"]),
        "data_envio": equip.get("data_envio", current_data["data_envio"]),
        "data_retorno": equip.get("data_retorno", current_data["data_retorno"]),
        "empresa": equip.get("empresa", current_data["empresa"]).upper(),
        "filial": equip.get("filial", current_data["filial"]),
        "retornou": equip.get("retornou", current_data["retornou"]),
        "tem_arquivo": equip.get("tem_arquivo", current_data["tem_arquivo"])
    }
    
    conn.execute("""
        UPDATE equipamentos 
        SET projeto = ?, fornecedor = ?, modelo = ?, numero_serie = ?, defeito = ?,
            data_envio = ?, data_retorno = ?, empresa = ?, filial = ?,
            retornou = ?, tem_arquivo = ?
        WHERE id = ?
    """, (
        updated_data["projeto"], updated_data["fornecedor"], updated_data["modelo"],
        updated_data["numero_serie"], updated_data["defeito"], updated_data["data_envio"],
        updated_data["data_retorno"], updated_data["empresa"], updated_data["filial"],
        updated_data["retornou"], updated_data["tem_arquivo"], equipamento_id
    ))
    conn.commit()
    conn.close()
    return {"message": "Atualizado com sucesso"}

@app.delete("/api/equipamentos/{equipamento_id}")
async def deletar_equipamento(equipamento_id: int):
    """Excluir equipamento"""
    conn = get_db()
    
    # Verificar se o equipamento existe
    existing = conn.execute("SELECT id FROM equipamentos WHERE id = ?", (equipamento_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    
    conn.execute("DELETE FROM equipamentos WHERE id = ?", (equipamento_id,))
    conn.commit()
    conn.close()
    return {"message": "Excluído com sucesso"}

@app.get("/api/dashboard")
async def dashboard():
    """Endpoint para dashboards"""
    conn = get_db()
    rows = conn.execute("SELECT * FROM equipamentos").fetchall()
    conn.close()

    total = len(rows)
    retornaram = sum(1 for r in rows if r["retornou"])
    com_arquivo = sum(1 for r in rows if r["tem_arquivo"])
    
    empresas = {}
    fornecedores = {}
    projetos = {}
    
    for r in rows:
        empresa = r["empresa"].upper()
        empresas[empresa] = empresas.get(empresa, 0) + 1
        fornecedores[r["fornecedor"]] = fornecedores.get(r["fornecedor"], 0) + 1
        projetos[r["projeto"]] = projetos.get(r["projeto"], 0) + 1

    return {
        "estatisticas_gerais": {
            "total_equipamentos": total,
            "retornaram": retornaram,
            "nao_retornaram": total - retornaram,
            "com_arquivo": com_arquivo,
            "sem_arquivo": total - com_arquivo,
            "percentual_retorno": round(retornaram / total * 100, 2) if total else 0,
            "percentual_arquivo": round(com_arquivo / total * 100, 2) if total else 0
        },
        "agrupamentos": {
            "empresas": empresas,
            "fornecedores": fornecedores,
            "projetos": projetos
        }
    }

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 SISTEMA DE EQUIPAMENTOS NSO - EDIÇÃO HABILITADA")
    print("="*60)
    
    # Verificar arquivos
    required_files = ['index.html', 'style.css', 'script.js']
    for file in required_files:
        file_path = os.path.join(BASE_DIR, file)
        if os.path.exists(file_path):
            print(f"✅ {file}: ENCONTRADO")
        else:
            print(f"❌ {file}: NÃO ENCONTRADO")
    
    print("="*60)
    print("🌐 Frontend: http://localhost:8000")
    print("📊 API Power BI: http://localhost:8000/api/equipamentos")
    print("📈 Dashboard: http://localhost:8000/#dashboard")
    print("🔍 Health Check: http://localhost:8000/api/health")
    print("="*60)
    
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")