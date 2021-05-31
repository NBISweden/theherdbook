import { commonAncestors, getConnectingEdges, Edge, uniqueAndCommonNodes, unique } from '@app/pedigree'

type Node = {id: string, x?: number, label: string, shape?: string,
    color?: string}

let duplicateNodes: Node[] = []
for (let i = 0; i < 5; i++) {
    duplicateNodes.push({"id": `${i}`, "label": `${i}`})
  }
duplicateNodes.push(...[{"id": "2", "label": "2"}, {"id": "4", "label": "4"}])
let commonNodes = ["2", "4"]
let uniqueNodes = [{"id": "0", "label": "0"}, {"id": "1", "label": "1"}, 
{"id": "2", "label": "2"}, {"id": "3", "label": "3"}, {"id": "4", "label": "4"}]

test('unique with key id', () => {
  expect(unique(duplicateNodes, 'id')).toEqual(uniqueNodes)
})

test('uniqueAndCommonNodes with key id', () => {
  expect(uniqueAndCommonNodes(duplicateNodes, 'id')).toEqual([uniqueNodes, new Set(commonNodes)])
})

let undefinedVar:string
let duplicateNumbers = [1, 1, 2, 2, 3, 4]
let commonNumbers = [1, 2]
let uniqueNumbers = [1, 2, 3, 4]

test('uniqueAndCommonNodes key not specified', () => {
  expect(uniqueAndCommonNodes(duplicateNumbers, undefinedVar)).toEqual([uniqueNumbers, new Set(commonNumbers)])
})

let edges: Edge[] = [{"id": "0-1", "from": "0", "to": "1"}, {"id": "0-2", "from": "0", "to": "2"}, {"id": "1-3", "from": "1", "to": "3"}, {"id": "1-4", "from": "1", "to": "4"},
{"id": "2-4", "from": "2", "to": "4"}, {"id": "2-5", "from": "2", "to": "5"}, {"id": "3-8", "from": "3", "to": "8"}, {"id": "3-6", "from": "3", "to": "6"},
{"id": "4-8", "from": "4", "to": "8"}, {"id": "5-6", "from": "5", "to": "6"}]

let ancestor4seeked0: string[] = ["0-1", "0-2", "1-4", "2-4"]
let ancestor6seeked0: string[] = ["0-1", "0-2", "1-3", "2-5", "3-6", "5-6"]
let ancestor8seeked1: string[] = ["1-3", "1-4", "3-8", "4-8"]

test('getConnectingEdges ancestorId 4, seekedId 0', () => {
  expect(getConnectingEdges(edges, '4', '0')).toEqual(new Set(ancestor4seeked0))
})

test('getConnectingEdges ancestorId 6, seekedId 0', () => {
  expect(getConnectingEdges(edges, '6', '0')).toEqual(new Set(ancestor6seeked0))
})

test('getConnectingEdges ancestorId 8, seekedId 1', () => {
  expect(getConnectingEdges(edges, '8', '1')).toEqual(new Set(ancestor8seeked1))
})

