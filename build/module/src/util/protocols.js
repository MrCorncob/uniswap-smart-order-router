import { Protocol } from '@uniswap/router-sdk';
export const TO_PROTOCOL = (protocol) => {
    switch (protocol.toLowerCase()) {
        case 'v3':
            return Protocol.V3;
        case 'v2':
            return Protocol.V2;
        default:
            throw new Error(`Unknown protocol: {id}`);
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdG9jb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3V0aWwvcHJvdG9jb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUUvQyxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsQ0FBQyxRQUFnQixFQUFZLEVBQUU7SUFDeEQsUUFBUSxRQUFRLENBQUMsV0FBVyxFQUFFLEVBQUU7UUFDOUIsS0FBSyxJQUFJO1lBQ1AsT0FBTyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQ3JCLEtBQUssSUFBSTtZQUNQLE9BQU8sUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUNyQjtZQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztLQUM3QztBQUNILENBQUMsQ0FBQyJ9