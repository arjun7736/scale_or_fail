'use client';

import { useId } from 'react';
import { getSmoothStepPath, Position, ViewportPortal, type Edge, type Node } from '@xyflow/react';
import { getArchitectureGroup } from '../../../lib/architecture-groups';

type Group = 'app' | 'replicas';

const groupStyles = {
  app: { label: 'App Server Cluster', color: '#f472b6' },
  replicas: { label: 'Read Replicas', color: '#c084fc' },
};

const flowColors: Record<string, string> = {
  http_traffic: '#22d3ee',
  edge_traffic: '#22d3ee',
  cache_access: '#4ade80',
  db_read: '#818cf8',
  db_read_write: '#818cf8',
  replication: '#facc15',
  async_message: '#d879f8',
  stream_processing: '#fb923c',
};

function getGroup(node: Node) {
  return getArchitectureGroup(node.type ?? node.data.type, node.data.config);
}

function getBounds(nodes: Node[], padding = 0, header = 0) {
  const left = Math.min(...nodes.map((node) => node.position.x)) - padding;
  const top = Math.min(...nodes.map((node) => node.position.y)) - padding - header;
  const right = Math.max(...nodes.map((node) => node.position.x + (node.measured?.width ?? 0))) + padding;
  const bottom = Math.max(...nodes.map((node) => node.position.y + (node.measured?.height ?? 0))) + padding;
  return { left, top, right, bottom };
}

export function groupConnections(nodes: Node[], edges: Edge[]) {
  const nodeMap = new Map(nodes.filter((node) => !node.hidden).map((node) => [node.id, node]));
  const groups = new Map<Group, { bounds: ReturnType<typeof getBounds>; count: number }>();
  for (const group of Object.keys(groupStyles) as Group[]) {
    const members = [...nodeMap.values()].filter((node) => getGroup(node) === group);
    if (members.length > 1 && members.every((node) => node.measured?.width && node.measured?.height)) {
      groups.set(group, { bounds: getBounds(members, 18, 22), count: members.length });
    }
  }

  const candidates = new Map<string, { source: Node; target: Node; sourceGroup?: Group; targetGroup?: Group; type: string; edges: Edge[] }>();
  for (const edge of edges) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    const type = String(edge.data?.edgeType ?? 'http_traffic');
    if (edge.hidden || edge.data?.isValid === false || !flowColors[type] ||
        !source?.measured?.width || !target?.measured?.width) continue;

    const sourceGroup = getGroup(source);
    const targetGroup = getGroup(target);
    const from = sourceGroup && groups.has(sourceGroup) ? sourceGroup : undefined;
    const to = targetGroup && groups.has(targetGroup) ? targetGroup : undefined;
    if ((!from && !to) || (from && from === to)) continue;

    const key = JSON.stringify([from, from ? null : source.id, to, to ? null : target.id, type]);
    const candidate = candidates.get(key);
    if (candidate) {
      candidate.edges.push(edge);
    } else {
      candidates.set(key, { source, target, sourceGroup: from, targetGroup: to, type, edges: [edge] });
    }
  }

  const hiddenEdgeIds = new Set<string>();
  const routes = [...candidates].flatMap(([id, bundle]) => {
    if (bundle.edges.length < 2) return [];
    bundle.edges.forEach((edge) => hiddenEdgeIds.add(edge.id));
    const source = (bundle.sourceGroup && groups.get(bundle.sourceGroup)?.bounds) || getBounds([bundle.source]);
    const target = (bundle.targetGroup && groups.get(bundle.targetGroup)?.bounds) || getBounds([bundle.target]);
    const flowsLeft = source.left + source.right > target.left + target.right;
    return [{
      id,
      ...bundle,
      sourceSide: bundle.sourceGroup && flowsLeft ? Position.Left : Position.Right,
      targetSide: bundle.targetGroup && flowsLeft ? Position.Right : Position.Left,
      color: bundle.type === 'async_message' && bundle.target.type === 'kafka_stream' ? '#fb923c' : flowColors[bundle.type],
      source,
      target,
      sourceY: (source.top + source.bottom) / 2,
      targetY: (target.top + target.bottom) / 2,
    }];
  });

  for (const [group, { bounds }] of groups) {
    for (const side of [Position.Left, Position.Right]) {
      const endpoints = routes.flatMap<{ route: (typeof routes)[number]; y: 'sourceY' | 'targetY'; peerY: number }>((route) => {
        if (route.sourceGroup === group && route.sourceSide === side) {
          return [{ route, y: 'sourceY', peerY: (route.target.top + route.target.bottom) / 2 }];
        }
        if (route.targetGroup === group && route.targetSide === side) {
          return [{ route, y: 'targetY', peerY: (route.source.top + route.source.bottom) / 2 }];
        }
        return [];
      }).sort((a, b) => a.peerY - b.peerY);
      endpoints.forEach(({ route, y }, index) => {
        route[y] = bounds.top + 36 + (bounds.bottom - bounds.top - 36) * (index + 1) / (endpoints.length + 1);
      });
    }
  }

  return { groups, routes, hiddenEdgeIds };
}

export function GroupedConnections({ layout, edgeIssues }: {
  layout: ReturnType<typeof groupConnections>;
  edgeIssues?: Record<string, { severity: string }[]>;
}) {
  const markerPrefix = useId();
  return (
    <ViewportPortal>
      <svg aria-hidden="true" className="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1">
        {[...layout.groups].map(([group, { bounds, count }]) => {
          const { label, color } = groupStyles[group];
          return (
            <g key={group}>
              <rect x={bounds.left} y={bounds.top} width={bounds.right - bounds.left} height={bounds.bottom - bounds.top}
                rx={16} fill={color} fillOpacity={0.035} stroke={color} strokeOpacity={0.75} strokeWidth={2} strokeDasharray="7 5" />
              <text x={bounds.left + 15} y={bounds.top + 24} fill={color} fontSize={14} fontWeight={700}>
                {label} ({count})
              </text>
            </g>
          );
        })}
        {layout.routes.map((route, index) => {
          const [path] = getSmoothStepPath({
            sourceX: route.source[route.sourceSide],
            sourceY: route.sourceY,
            sourcePosition: route.sourceSide,
            targetX: route.target[route.targetSide],
            targetY: route.targetY,
            targetPosition: route.targetSide,
            borderRadius: 14,
            offset: 18,
          });
          const issues = route.edges.flatMap((edge) => edgeIssues?.[edge.id] ?? []);
          const color = issues.some((issue) => issue.severity === 'error') ? '#f43f5e'
            : issues.some((issue) => issue.severity === 'warning') ? '#f59e0b' : route.color;
          const markerId = `${markerPrefix}-bundle-${index}`;
          return (
            <g key={route.id}>
              <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                <path d="M0 0L10 5L0 10Z" fill={color} />
              </marker>
              <path d={path} fill="none" stroke={color} strokeWidth={3.5} markerEnd={`url(#${markerId})`}
                strokeDasharray={route.type === 'replication' || route.type === 'cache_access' ? '7 5' : undefined} />
            </g>
          );
        })}
      </svg>
    </ViewportPortal>
  );
}
