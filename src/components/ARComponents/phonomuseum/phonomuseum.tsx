import React from 'react';
import * as AR from '../../../ARbackend/ARVisualizer';

const PhonomuseumPage: React.FC = () => {
    return (
        <div>
            <h1>Phonomuseum AR Component</h1>
        </div>
    );
};

export default PhonomuseumPage;

let ARObject = new AR.ARVisualizer();
ARObject.startVisualization();