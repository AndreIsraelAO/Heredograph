/**
 * Componente SVG para traçado de linhas de relações do heredograma
 * Renderiza:
 * - Linhas de união (casamento simples, consanguíneo com linha dupla, divórcio)
 * - Linhas de descendência (tronco vertical, barramento horizontal de irmãos)
 * - Conexões específicas de gêmeos (monozigóticos com barra e dizigóticos)
 * - Notação de adoção
 */

import React from 'react';
import { LayoutUnion, ParentChildRelation } from '../../domain/types';

interface ConnectionLinesProps {
  unions: LayoutUnion[];
  allFiliations: ParentChildRelation[];
}

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({ unions }) => {
  const strokeColor = '#1E293B'; // Slate 800
  const lineWidth = 2;

  return (
    <g className="connections-layer pointer-events-none">
      {unions.map((u) => {
        const { union, partner1Node, partner2Node, midpointX, y, children } = u;

        const isSameGen = Math.abs(partner1Node.y - partner2Node.y) <= 20;
        const isConsanguineous = union.isConsanguineous;
        const isDivorced = union.type === 'DIVORCED';

        const unionLines: React.ReactNode[] = [];
        let unionMidX = midpointX;
        let unionStemY = y;

        if (isSameGen) {
          const isP1Left = partner1Node.x < partner2Node.x;
          const leftNode = isP1Left ? partner1Node : partner2Node;
          const rightNode = isP1Left ? partner2Node : partner1Node;

          const p1ConnectX = leftNode.x + leftNode.width;
          const p2ConnectX = rightNode.x;
          const unionY = leftNode.y + leftNode.height / 2;
          unionStemY = unionY;
          unionMidX = (p1ConnectX + p2ConnectX) / 2;

          if (isConsanguineous) {
            // Linha dupla para casamento consanguíneo
            unionLines.push(
              <line
                key={`consang-1-${union.id}`}
                x1={p1ConnectX}
                y1={unionY - 3}
                x2={p2ConnectX}
                y2={unionY - 3}
                stroke={strokeColor}
                strokeWidth={lineWidth}
              />,
              <line
                key={`consang-2-${union.id}`}
                x1={p1ConnectX}
                y1={unionY + 3}
                x2={p2ConnectX}
                y2={unionY + 3}
                stroke={strokeColor}
                strokeWidth={lineWidth}
              />
            );
          } else {
            // Linha simples de casamento
            unionLines.push(
              <line
                key={`union-${union.id}`}
                x1={p1ConnectX}
                y1={unionY}
                x2={p2ConnectX}
                y2={unionY}
                stroke={strokeColor}
                strokeWidth={lineWidth}
              />
            );
          }

          // Marcas de divórcio (//) se aplicável
          if (isDivorced) {
            const midX = (p1ConnectX + p2ConnectX) / 2;
            unionLines.push(
              <line
                key={`div-1-${union.id}`}
                x1={midX - 4}
                y1={unionY + 8}
                x2={midX + 2}
                y2={unionY - 8}
                stroke={strokeColor}
                strokeWidth={lineWidth}
              />,
              <line
                key={`div-2-${union.id}`}
                x1={midX}
                y1={unionY + 8}
                x2={midX + 6}
                y2={unionY - 8}
                stroke={strokeColor}
                strokeWidth={lineWidth}
              />
            );
          }
        } else {
          // União Intergeracional (ex: casamento entre gerações diferentes / filho com pai)
          const upperNode = partner1Node.y <= partner2Node.y ? partner1Node : partner2Node;
          const lowerNode = partner1Node.y <= partner2Node.y ? partner2Node : partner1Node;

          const upperY = upperNode.y + upperNode.height / 2;
          const lowerY = lowerNode.y + lowerNode.height / 2;
          unionStemY = lowerY;

          let pUpperX: number;
          let pLowerX: number;
          let turnX: number;

          if (lowerNode.x >= upperNode.x + upperNode.width) {
            pUpperX = upperNode.x + upperNode.width;
            pLowerX = lowerNode.x;
            turnX = (pUpperX + pLowerX) / 2;
          } else if (lowerNode.x + lowerNode.width <= upperNode.x) {
            pUpperX = upperNode.x;
            pLowerX = lowerNode.x + lowerNode.width;
            turnX = (pUpperX + pLowerX) / 2;
          } else {
            // Alinhados verticalmente: contorna pelo lado direito
            pUpperX = upperNode.x + upperNode.width;
            pLowerX = lowerNode.x + lowerNode.width;
            turnX = Math.max(upperNode.x + upperNode.width, lowerNode.x + lowerNode.width) + 32;
          }

          unionMidX = (pLowerX + turnX) / 2;

          const drawStepped = (offset: number) => (
            <path
              key={`intergen-${union.id}-${offset}`}
              d={`M ${pUpperX} ${upperY + offset} L ${turnX + offset} ${upperY + offset} L ${turnX + offset} ${lowerY + offset} L ${pLowerX} ${lowerY + offset}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth={lineWidth}
            />
          );

          if (isConsanguineous) {
            unionLines.push(drawStepped(-2.5), drawStepped(2.5));
          } else {
            unionLines.push(drawStepped(0));
          }
        }

        // 2. Traçado dos Filhos (Prole)
        if (children.length === 0) {
          return <g key={`group-${union.id}`}>{unionLines}</g>;
        }

        // Altura do barramento horizontal de irmãos (abaixo dos rótulos de nomes e datas com folga segura)
        const isGenetic = partner1Node.width <= 50;
        const busY = unionStemY + (isGenetic ? 95 : 75);

        // Se há apenas 1 filho e ele está alinhado diretamente sob o tronco da união:
        if (
          children.length === 1 &&
          Math.abs(children[0].childNode.x + children[0].childNode.width / 2 - unionMidX) < 4
        ) {
          const childObj = children[0];
          const childX = childObj.childNode.x + childObj.childNode.width / 2;
          const isAdopted = childObj.filiation.filiationType === 'ADOPTED';

          return (
            <g key={`group-${union.id}`}>
              {unionLines}
              {/* Linha vertical contínua direta e perfeitamente fixa da união até o filho */}
              <line
                x1={childX}
                y1={unionStemY}
                x2={childX}
                y2={childObj.childNode.y}
                stroke={strokeColor}
                strokeWidth={lineWidth}
                strokeDasharray={isAdopted ? '4 3' : undefined}
              />
            </g>
          );
        }

        // Identifica gêmeos na união
        const twinGroups = new Map<string, typeof children>();
        const nonTwinChildren: typeof children = [];

        for (const childObj of children) {
          const tgId = childObj.filiation.twinGroupId;
          if (tgId) {
            if (!twinGroups.has(tgId)) twinGroups.set(tgId, []);
            twinGroups.get(tgId)!.push(childObj);
          } else {
            nonTwinChildren.push(childObj);
          }
        }

        // Calcula limites do barramento horizontal (inclui o tronco central e todos os filhos)
        const childXPositions = children.map((c) => c.childNode.x + c.childNode.width / 2);
        const minChildX = Math.min(...childXPositions, unionMidX);
        const maxChildX = Math.max(...childXPositions, unionMidX);

        return (
          <g key={`group-${union.id}`}>
            {unionLines}

            {/* Tronco vertical descendente a partir da união */}
            <line
              x1={unionMidX}
              y1={unionStemY}
              x2={unionMidX}
              y2={busY}
              stroke={strokeColor}
              strokeWidth={lineWidth}
            />

            {/* Barramento horizontal conectando o tronco da união a todos os filhos */}
            {maxChildX > minChildX && (
              <line
                x1={minChildX}
                y1={busY}
                x2={maxChildX}
                y2={busY}
                stroke={strokeColor}
                strokeWidth={lineWidth}
              />
            )}

            {/* Filhos não-gêmeos: descida vertical simples */}
            {nonTwinChildren.map((childObj) => {
              const childX = childObj.childNode.x + childObj.childNode.width / 2;
              const childTopY = childObj.childNode.y;
              const isAdopted = childObj.filiation.filiationType === 'ADOPTED';

              return (
                <g key={`child-line-${childObj.childNode.person.id}`}>
                  <line
                    x1={childX}
                    y1={busY}
                    x2={childX}
                    y2={childTopY}
                    stroke={strokeColor}
                    strokeWidth={lineWidth}
                    strokeDasharray={isAdopted ? '4 3' : undefined}
                  />
                  {/* Colchetes para filiação adotiva */}
                  {isAdopted && (
                    <g stroke={strokeColor} strokeWidth={1.5} fill="none">
                      <path
                        d={`M ${childObj.childNode.x - 4} ${childTopY - 2} L ${childObj.childNode.x - 8} ${childTopY - 2} L ${childObj.childNode.x - 8} ${childTopY + childObj.childNode.height + 2} L ${childObj.childNode.x - 4} ${childTopY + childObj.childNode.height + 2}`}
                      />
                      <path
                        d={`M ${childObj.childNode.x + childObj.childNode.width + 4} ${childTopY - 2} L ${childObj.childNode.x + childObj.childNode.width + 8} ${childTopY - 2} L ${childObj.childNode.x + childObj.childNode.width + 8} ${childTopY + childObj.childNode.height + 2} L ${childObj.childNode.x + childObj.childNode.width + 4} ${childTopY + childObj.childNode.height + 2}`}
                      />
                    </g>
                  )}
                </g>
              );
            })}

            {/* Gêmeos: linhas angulares que convergem em um ponto comum no barramento */}
            {Array.from(twinGroups.entries()).map(([tgId, twinList]) => {
              if (twinList.length < 2) {
                // Caso anormal com 1 membro apenas
                const c = twinList[0];
                const cx = c.childNode.x + c.childNode.width / 2;
                return (
                  <line
                    key={`twin-single-${tgId}`}
                    x1={cx}
                    y1={busY}
                    x2={cx}
                    y2={c.childNode.y}
                    stroke={strokeColor}
                    strokeWidth={lineWidth}
                  />
                );
              }

              const [t1, t2] = twinList;
              const x1 = t1.childNode.x + t1.childNode.width / 2;
              const y1 = t1.childNode.y;
              const x2 = t2.childNode.x + t2.childNode.width / 2;
              const y2 = t2.childNode.y;

              const apexX = (x1 + x2) / 2;
              const apexY = busY;

              const isMonozygotic = t1.filiation.twinType === 'MONOZYGOTIC';

              // Ponto intermediário na linha angular para a barra transversal dos monozigóticos
              const midBarY = apexY + (y1 - apexY) * 0.45;
              const midBarX1 = apexX + (x1 - apexX) * 0.45;
              const midBarX2 = apexX + (x2 - apexX) * 0.45;

              return (
                <g key={`twin-group-${tgId}`}>
                  {/* Linhas que convergem no ponto comum */}
                  <line
                    x1={apexX}
                    y1={apexY}
                    x2={x1}
                    y2={y1}
                    stroke={strokeColor}
                    strokeWidth={lineWidth}
                  />
                  <line
                    x1={apexX}
                    y1={apexY}
                    x2={x2}
                    y2={y2}
                    stroke={strokeColor}
                    strokeWidth={lineWidth}
                  />
                  {/* Barra transversal de gêmeos monozigóticos (univitelinos) */}
                  {isMonozygotic && (
                    <line
                      x1={midBarX1}
                      y1={midBarY}
                      x2={midBarX2}
                      y2={midBarY}
                      stroke={strokeColor}
                      strokeWidth={lineWidth}
                    />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
};
