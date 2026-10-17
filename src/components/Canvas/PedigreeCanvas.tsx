/**
 * Componente Principal do Canvas do Heredograma (SVG Interativo)
 * Oferece pan, zoom livre, ajuste à tela, arrasto manual de nós,
 * destaque de linhagens e numeração lateral de gerações.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FamilyProject, LayoutNode, LayoutResult } from '../../domain/types';
import { GenealogicalCard } from '../Nodes/GenealogicalCard';
import { GeneticSymbol } from '../Nodes/GeneticSymbol';
import { ConnectionLines } from './ConnectionLines';

interface PedigreeCanvasProps {
  project: FamilyProject;
  layout: LayoutResult;
  selectedPersonId: string | null;
  ancestorIds: Set<string>;
  descendantIds: Set<string>;
  onSelectPerson: (personId: string | null) => void;
  onUpdatePersonPosition: (personId: string, customX: number, customY: number) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export const PedigreeCanvas: React.FC<PedigreeCanvasProps> = ({
  project,
  layout,
  selectedPersonId,
  ancestorIds,
  descendantIds,
  onSelectPerson,
  onUpdatePersonPosition,
  svgRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Estados de transformação visual (pan e zoom)
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 30 });

  // Estados de interação
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Arrasto individual de nós
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  /**
   * Ajusta a visualização para enquadrar perfeitamente todo o heredograma ("Fit to Screen")
   */
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { width: containerWidth, height: containerHeight } =
      containerRef.current.getBoundingClientRect();
    const bounds = layout.bounds;

    const padding = 80;
    const availableWidth = Math.max(100, containerWidth - padding * 2);
    const availableHeight = Math.max(100, containerHeight - padding * 2);

    const scaleX = availableWidth / (bounds.width || 1000);
    const scaleY = availableHeight / (bounds.height || 600);
    const newScale = Math.min(Math.max(0.35, Math.min(scaleX, scaleY)), 1.4);

    const centerX = (containerWidth - bounds.width * newScale) / 2 - bounds.minX * newScale;
    const centerY = (containerHeight - bounds.height * newScale) / 2 - bounds.minY * newScale;

    setScale(newScale);
    setPan({ x: centerX, y: centerY });
  }, [layout.bounds]);

  // Enquadra na primeira renderização
  useEffect(() => {
    const timer = setTimeout(() => {
      fitToScreen();
    }, 50);
    return () => clearTimeout(timer);
  }, []); // Executa na montagem inicial

  /**
   * Manipulação de Zoom via Scroll do Mouse
   */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newScale = Math.min(Math.max(0.2, scale * zoomFactor), 3.0);

    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    // Zoom centrado na posição do cursor
    const newPanX = cursorX - (cursorX - pan.x) * (newScale / scale);
    const newPanY = cursorY - (cursorY - pan.y) * (newScale / scale);

    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  /**
   * Início do Pan no Fundo do Canvas
   */
  const handlePointerDownBackground = (e: React.PointerEvent) => {
    if (e.target !== svgRef.current && (e.target as HTMLElement).tagName !== 'rect') {
      return;
    }
    // Deseleciona pessoa se clicou no fundo vazio
    onSelectPerson(null);
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  /**
   * Início de arrasto de um nó
   */
  const handlePointerDownNode = (e: React.PointerEvent, personId: string) => {
    e.stopPropagation();
    const node = layout.nodes.find((n) => n.person.id === personId);
    if (!node) return;

    setDraggingNodeId(personId);
    setDragOffset({
      x: (e.clientX - pan.x) / scale - node.x,
      y: (e.clientY - pan.y) / scale - node.y,
    });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  /**
   * Movimento do ponteiro (Pan ou Arrasto de Nó)
   */
  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingNodeId) {
      const newX = (e.clientX - pan.x) / scale - dragOffset.x;
      const newY = (e.clientY - pan.y) / scale - dragOffset.y;
      onUpdatePersonPosition(draggingNodeId, Math.round(newX), Math.round(newY));
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  /**
   * Fim de Pan ou Arrasto
   */
  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  };

  /**
   * Clique em indivíduo
   */
  const handleClickNode = (e: React.MouseEvent, personId: string) => {
    e.stopPropagation();
    onSelectPerson(personId);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full overflow-hidden bg-slate-50/70 select-none cursor-grab active:cursor-grabbing print-canvas-container"
      onWheel={handleWheel}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* SVG Canvas com Zoom e Pan */}
      <svg
        ref={svgRef}
        className="w-full h-full block"
        onPointerDown={handlePointerDownBackground}
      >
        <defs>
          {/* Marcador de Seta para Probando */}
          <marker
            id="proband-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#0284C7" />
          </marker>

          {/* Padrão de Grade Técnica de Fundo */}
          <pattern
            id="grid-dots"
            width={32}
            height={32}
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.2" fill="#CBD5E1" opacity="0.65" />
          </pattern>
        </defs>

        {/* Fundo clicável com padrão de grade */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#grid-dots)"
        />

        {/* Grupo Matricial Transformado */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
          {/* 1. Indicadores de Geração na Margem Esquerda (I, II, III...) */}
          {layout.generationLevels.map((gl) => (
            <g key={`gen-level-${gl.level}`}>
              {/* Linha guia suave horizontal da geração */}
              <line
                x1={layout.bounds.minX}
                y1={gl.y}
                x2={layout.bounds.maxX}
                y2={gl.y}
                stroke="#E2E8F0"
                strokeWidth={1}
                strokeDasharray="4 6"
              />
              {/* Rótulo Romano */}
              <text
                x={layout.bounds.minX - 40}
                y={gl.y + 6}
                textAnchor="middle"
                fontSize="18"
                fontWeight="700"
                fontFamily="'JetBrains Mono', monospace"
                fill="#64748B"
              >
                {gl.roman}
              </text>
            </g>
          ))}

          {/* 2. Camada de Conexões e Relações */}
          <ConnectionLines
            unions={layout.unions}
            allFiliations={project.parentChildRelations}
          />

          {/* 3. Camada de Nós dos Indivíduos */}
          {layout.nodes.map((node) => {
            const isSelected = selectedPersonId === node.person.id;
            const isAncestor = ancestorIds.has(node.person.id);
            const isDescendant = descendantIds.has(node.person.id);

            if (project.viewMode === 'GENETIC') {
              return (
                <GeneticSymbol
                  key={node.person.id}
                  node={node}
                  isSelected={isSelected}
                  isAncestor={isAncestor}
                  isDescendant={isDescendant}
                  onPointerDown={handlePointerDownNode}
                  onClick={handleClickNode}
                />
              );
            }

            return (
              <GenealogicalCard
                key={node.person.id}
                node={node}
                isSelected={isSelected}
                isAncestor={isAncestor}
                isDescendant={isDescendant}
                onPointerDown={handlePointerDownNode}
                onClick={handleClickNode}
              />
            );
          })}
        </g>
      </svg>

      {/* Controles Flutuantes de Navegação (HUD) */}
      <div className="absolute bottom-5 right-5 flex items-center bg-white/95 backdrop-blur shadow-sm border border-slate-200 rounded-lg p-1 gap-1 z-10 no-print">
        <button
          onClick={() => {
            const newScale = Math.max(0.2, scale * 0.85);
            setScale(newScale);
          }}
          title="Diminuir Zoom"
          className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded text-base font-bold transition-colors"
          aria-label="Diminuir Zoom"
        >
          −
        </button>
        <span className="text-xs font-mono tabular-nums px-2 text-slate-600 min-w-[50px] text-center font-medium">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => {
            const newScale = Math.min(3.0, scale * 1.15);
            setScale(newScale);
          }}
          title="Aumentar Zoom"
          className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded text-base font-bold transition-colors"
          aria-label="Aumentar Zoom"
        >
          +
        </button>
        <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />
        <button
          onClick={fitToScreen}
          title="Encaixar na Tela"
          className="px-2.5 h-8 flex items-center text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors whitespace-nowrap"
        >
          Encaixar
        </button>
        <button
          onClick={() => {
            setScale(1);
            setPan({ x: 80, y: 60 });
          }}
          title="Zoom 100%"
          className="px-2 h-8 flex items-center text-xs font-medium text-slate-500 hover:bg-slate-100 rounded transition-colors"
        >
          100%
        </button>
      </div>
    </div>
  );
};
