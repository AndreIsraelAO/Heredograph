/**
 * Componente SVG para renderização de símbolos médicos de heredogramas genéticos
 * Padrão oficial de genética médica:
 * - Quadrado: Masculino
 * - Círculo: Feminino
 * - Losango: Outro / Desconhecido
 * - Preenchido: Afetado
 * - Ponto Central: Portador
 * - Barra Diagonal: Falecido
 * - Seta 'P': Probando
 */

import React from 'react';
import { LayoutNode } from '../../domain/types';

interface GeneticSymbolProps {
  node: LayoutNode;
  isSelected: boolean;
  isAncestor: boolean;
  isDescendant: boolean;
  onPointerDown: (e: React.PointerEvent, personId: string) => void;
  onClick: (e: React.MouseEvent, personId: string) => void;
}

export const GeneticSymbol: React.FC<GeneticSymbolProps> = ({
  node,
  isSelected,
  isAncestor,
  isDescendant,
  onPointerDown,
  onClick,
}) => {
  const { person, x, y, width, height, generationIndex } = node;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const size = width;
  const half = size / 2;

  // Determina classes de preenchimento e cores
  const isAffected = person.clinicalStatus === 'AFFECTED';
  const isCarrier = person.clinicalStatus === 'CARRIER';
  const isDeceased = person.isDeceased;
  const isProband = person.isProband;

  // Cor principal do símbolo
  const strokeColor = '#0F172A'; // Slate 900
  const fillColor = isAffected ? '#0F172A' : '#FFFFFF';

  // Anel de destaque
  let highlightRing = null;
  if (isSelected) {
    highlightRing = (
      <rect
        x={x - 8}
        y={y - 8}
        width={width + 16}
        height={height + 16}
        rx={8}
        fill="none"
        stroke="#0284C7"
        strokeWidth={2.5}
        strokeDasharray="4 2"
        className="animate-pulse"
      />
    );
  } else if (isAncestor) {
    highlightRing = (
      <rect
        x={x - 6}
        y={y - 6}
        width={width + 12}
        height={height + 12}
        rx={6}
        fill="none"
        stroke="#0284C7"
        strokeWidth={2}
      />
    );
  } else if (isDescendant) {
    highlightRing = (
      <rect
        x={x - 6}
        y={y - 6}
        width={width + 12}
        height={height + 12}
        rx={6}
        fill="none"
        stroke="#059669"
        strokeWidth={2}
      />
    );
  }

  // Renderiza a forma geométrica de acordo com o sexo
  let symbolShape = null;

  if (person.sex === 'M') {
    // Quadrado masculino
    symbolShape = (
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={2.5}
      />
    );
  } else if (person.sex === 'F') {
    // Círculo feminino
    symbolShape = (
      <circle
        cx={centerX}
        cy={centerY}
        r={half}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={2.5}
      />
    );
  } else {
    // Losango (outro / sexo não informado)
    const points = `${centerX},${y} ${x + size},${centerY} ${centerX},${y + size} ${x},${centerY}`;
    symbolShape = (
      <polygon
        points={points}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={2.5}
      />
    );
  }

  return (
    <g
      className="cursor-pointer group select-none transition-transform"
      onPointerDown={(e) => onPointerDown(e, person.id)}
      onClick={(e) => onClick(e, person.id)}
      role="button"
      tabIndex={0}
      aria-label={`${person.name}, Geração ${node.generation}, Indivíduo ${generationIndex}`}
    >
      {highlightRing}
      {symbolShape}

      {/* Ponto central para portadores (Carrier) */}
      {isCarrier && !isAffected && (
        <circle cx={centerX} cy={centerY} r={5} fill={strokeColor} />
      )}

      {/* Traço diagonal de falecimento */}
      {isDeceased && (
        <line
          x1={x - 4}
          y1={y + size + 4}
          x2={x + size + 4}
          y2={y - 4}
          stroke={strokeColor}
          strokeWidth={2.5}
        />
      )}

      {/* Seta diagnóstica de probando (P) */}
      {isProband && (
        <g transform={`translate(${x - 22}, ${y + size + 20})`}>
          <line
            x1={0}
            y1={0}
            x2={16}
            y2={-16}
            stroke="#0284C7"
            strokeWidth={3}
            markerEnd="url(#proband-arrow)"
          />
          <text
            x={-4}
            y={6}
            fill="#0284C7"
            fontSize="14"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            P
          </text>
        </g>
      )}

      {/* Número do indivíduo na geração (ex: 1, 2, 3...) */}
      <text
        x={centerX}
        y={y + size + 14}
        textAnchor="middle"
        fontSize="11"
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="700"
        fill="#334155"
        paintOrder="stroke fill"
        stroke="#FFFFFF"
        strokeWidth={4.5}
        strokeLinejoin="round"
      >
        {generationIndex}
      </text>

      {/* Nome simplificado com proteção contra overlap de linhas */}
      <text
        x={centerX}
        y={y + size + 27}
        textAnchor="middle"
        fontSize="11"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontWeight="600"
        fill="#0F172A"
        paintOrder="stroke fill"
        stroke="#FFFFFF"
        strokeWidth={4.5}
        strokeLinejoin="round"
        className="max-w-[110px] select-none"
      >
        {person.name.length > 14 ? `${person.name.slice(0, 13)}…` : person.name}
      </text>

      {/* Data de nascimento ou falecimento se houver */}
      {person.birthDate && (
        <text
          x={centerX}
          y={y + size + 39}
          textAnchor="middle"
          fontSize="9.5"
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="500"
          fill="#475569"
          paintOrder="stroke fill"
          stroke="#FFFFFF"
          strokeWidth={4}
          strokeLinejoin="round"
        >
          {person.birthDate.split('-')[0]}
          {person.deathDate ? ` - ${person.deathDate.split('-')[0]}` : ''}
        </text>
      )}
    </g>
  );
};
