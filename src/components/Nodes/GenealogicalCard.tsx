/**
 * Componente SVG para exibição de indivíduos no Modo Genealógico
 * Exibe cartão visual com nome legível, datas de nascimento/falecimento,
 * local de origem e indicadores de parentesco.
 */

import React from 'react';
import { LayoutNode } from '../../domain/types';

interface GenealogicalCardProps {
  node: LayoutNode;
  isSelected: boolean;
  isAncestor: boolean;
  isDescendant: boolean;
  onPointerDown: (e: React.PointerEvent, personId: string) => void;
  onClick: (e: React.MouseEvent, personId: string) => void;
}

export const GenealogicalCard: React.FC<GenealogicalCardProps> = ({
  node,
  isSelected,
  isAncestor,
  isDescendant,
  onPointerDown,
  onClick,
}) => {
  const { person, x, y, width, height } = node;

  let borderColor = '#E2E8F0';
  let borderWidth = 1.5;
  let bgColor = '#FFFFFF';

  if (isSelected) {
    borderColor = '#0284C7';
    borderWidth = 2.5;
    bgColor = '#F0F9FF';
  } else if (isAncestor) {
    borderColor = '#0284C7';
    borderWidth = 2;
    bgColor = '#F8FAFC';
  } else if (isDescendant) {
    borderColor = '#059669';
    borderWidth = 2;
    bgColor = '#F0FDF4';
  }

  const birthYear = person.birthDate ? person.birthDate.split('-')[0] : '';
  const deathYear = person.deathDate ? person.deathDate.split('-')[0] : '';
  let dateText = '';
  if (birthYear && deathYear) {
    dateText = `*${birthYear}  †${deathYear}`;
  } else if (birthYear) {
    dateText = `*${birthYear}${person.isDeceased ? ' (fal.)' : ''}`;
  } else if (person.isDeceased) {
    dateText = 'Falecido(a)';
  }

  // Sex icon color
  const sexColor = person.sex === 'M' ? '#0284C7' : person.sex === 'F' ? '#D946EF' : '#64748B';

  return (
    <g
      className="cursor-pointer group select-none transition-transform"
      onPointerDown={(e) => onPointerDown(e, person.id)}
      onClick={(e) => onClick(e, person.id)}
      role="button"
      tabIndex={0}
      aria-label={`${person.name}, Genealogia`}
    >
      {/* Retângulo do Cartão */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill={bgColor}
        stroke={borderColor}
        strokeWidth={borderWidth}
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.04))"
      />

      {/* Faixa decorativa superior com cor do sexo */}
      <rect
        x={x}
        y={y}
        width={width}
        height={4}
        rx={2}
        fill={sexColor}
      />

      {/* Ícone ou círculo de avatar */}
      <circle
        cx={x + 22}
        cy={y + 26}
        r={12}
        fill="#F1F5F9"
        stroke={sexColor}
        strokeWidth={1.5}
      />
      <text
        x={x + 22}
        y={y + 30}
        textAnchor="middle"
        fontSize="10"
        fontFamily="sans-serif"
        fontWeight="bold"
        fill={sexColor}
      >
        {person.sex === 'M' ? '♂' : person.sex === 'F' ? '♀' : '◇'}
      </text>

      {/* Nome da Pessoa */}
      <text
        x={x + 40}
        y={y + 28}
        fontSize="12"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontWeight="600"
        fill="#0F172A"
      >
        {person.name.length > 13 ? `${person.name.slice(0, 11)}…` : person.name}
      </text>

      {/* Datas */}
      <text
        x={x + 12}
        y={y + 50}
        fontSize="10"
        fontFamily="'JetBrains Mono', monospace"
        fill="#475569"
      >
        {dateText || 'Datas não inf.'}
      </text>

      {/* Local de nascimento ou notas */}
      {person.birthPlace && (
        <text
          x={x + 12}
          y={y + 66}
          fontSize="9"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fill="#94A3B8"
        >
          {person.birthPlace.length > 20 ? `${person.birthPlace.slice(0, 18)}…` : person.birthPlace}
        </text>
      )}
    </g>
  );
};
