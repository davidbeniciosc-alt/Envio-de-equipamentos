import pandas as pd
import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "equipamentosnso.db")
EXCEL_PATH = os.path.join(BASE_DIR, "data", "equipamentosnso.xlsx")

df = pd.read_excel(EXCEL_PATH)

conn = sqlite3.connect(DB_PATH)

for _, row in df.iterrows():
    conn.execute("""
        INSERT INTO equipamentos (
            projeto, fornecedor, modelo, numero_serie, defeito,
            data_envio, data_retorno, empresa, filial,
            retornou, tem_arquivo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        row["projeto"],
        row["fornecedor"],
        row["modelo"],
        str(row["numero_serie"]),
        row["defeito"],
        str(row["data_envio"]),
        str(row["data_retorno"]) if not pd.isna(row["data_retorno"]) else None,
        row["empresa"],
        row["filial"],
        int(row["retornou"]),
        int(row["tem_arquivo"]),
    ))

conn.commit()
conn.close()

print("✅ Dados importados do Excel com sucesso")
