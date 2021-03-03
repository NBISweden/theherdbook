import { commonAncestors, colourEdges, Edge } from '@app/pedigree'

type Node = {id: string, x?: number, label: string, shape?: string,
    color?: string}

let duplicateNodes: Node[] = []
for (let i = 0; i < 9; i++) {
    duplicateNodes.push({"id": `${i}`, "label": `${i}`})
  }
duplicateNodes.push(...[{"id": "4", "label": "4"}, {"id": "6", "label": "6"}])
let commonNodes = ["4", "6"]

test('commonAncestors with key id', () => {
    expect(commonAncestors(duplicateNodes, 'id')).toEqual(new Set(commonNodes))
  })

let undefinedVar:string
let duplicateNumbers = [1, 1, 2, 2, 3, 4]
let commonNumbers = [1, 2]

test('commonAncestors key not specified', () => {
expect(commonAncestors(duplicateNumbers, undefinedVar)).toEqual(new Set(commonNumbers))
})

let edges: Edge[] = [{"id": "0-1", "from": "0", "to": "1"}, {"id": "0-2", "from": "0", "to": "2"}, {"id": "1-3", "from": "1", "to": "3"}, {"id": "1-4", "from": "1", "to": "4"},
{"id": "2-4", "from": "2", "to": "4"}, {"id": "2-5", "from": "2", "to": "5"}, {"id": "3-8", "from": "3", "to": "8"}, {"id": "3-6", "from": "3", "to": "6"},
{"id": "4-8", "from": "4", "to": "8"}, {"id": "5-6", "from": "5", "to": "6"}]

let root4seeked0: string[] = ["0-1", "0-2", "1-4", "2-4"]
let root6seeked0: string[] = ["0-1", "0-2", "1-3", "2-5", "3-6", "5-6"]
let root8seeked1: string[] = ["1-3", "1-4", "3-8", "4-8"]

test('colourEdges root id 4, seekedNode 0', () => {
  expect(colourEdges(edges, '4', '0')).toEqual(new Set(root4seeked0))
})

test('colourEdges root id 6, seekedNode 0', () => {
  expect(colourEdges(edges, '6', '0')).toEqual(new Set(root6seeked0))
})

test('colourEdges root id 8, seekedNode 1', () => {
  expect(colourEdges(edges, '8', '1')).toEqual(new Set(root8seeked1))
})

